# encoding: utf-8
import re
import csv
from datetime import date
from bs4 import BeautifulSoup
import requests
import dataset
import logging


logging.getLogger().setLevel(logging.WARNING)


ds = dataset.connect('sqlite:///donations.db')

key_dict = dict()


def load_keys():
    for e in ds['keys']:
        if e['name'] != '':
            key_dict[e['name']] = e['key']


def parse_date(d, r=None):
    if d[0:4] == 'per ':
        d = d[4:]
    try:
        parts = d.split('.')
        if '/' in d:
            parts = filter(lambda k: '/' not in k, parts)
        if '-' in d:
            parts = filter(lambda k: '-' not in k, parts)
        parts = map(int, parts)
        if parts[2] < 100:
            parts[2] += 2000
        try:
            return date(parts[2], parts[1], parts[0])
        except:
            print 'could not cast to date'
            print d, parts
    except:
        print 'could not map to int'
        print d, r
    print '\nPlease enter the correct date (DD.MM.YYYY):'
    print ' ❯',
    return parse_date(raw_input())


def split_rows(d):
    return filter(lambda k: isinstance(k, (str, unicode)), d.contents)


def clean_party(p):
    if p == u'BÜNDNIS 90/ DIE GRÜNEN':
        return u'GRÜNE'
    if p == 'FDP1':
        return 'FDP'
    if p == 'DIE LINKE.':
        return 'LINKE'
    return p


def scrape_online():
    url = 'http://www.bundestag.de/bundestag/parteienfinanzierung/fundstellen50000/'
    r = requests.get(url)
    r.encoding = 'utf-8'  # force utf-8
    soup = BeautifulSoup(r.text)
    yearMenu = soup.find('div', 'jahreLeiste').find_all('li')
    first = True
    for li in yearMenu:
        if not first:
            soup = BeautifulSoup(requests.get(url + li.a['href']).text)
        first = False

        table = soup.find('table')

        for row in table.find_all('tr'):
            cells = row.find_all('td')
            if len(cells) < 4:
                continue
            party = clean_party(cells[0].text)
            amount = cells[1].text
            if 'Korrigierter Betrag:' in amount:
                amount = amount[20:]
            amount = float(amount.replace('.', '').replace(',', '.'))
            if cells[2].p is not None:
                donor = split_rows(cells[2].p)
            else:
                donor = split_rows(cells[2]) #.split('<br />')
            date1 = parse_date(split_rows(cells[3])[0])
            if len(cells) > 4:
                date2 = parse_date(split_rows(cells[4])[0])
            else:
                print 'no second date'
                date2 = None
            while len(donor) < 3:
                donor.append('')
            d = dict(
                name=donor[0].strip(),
                party=party.strip(),
                amount=amount,
                date1=date1,
                date2=date2,
                addr1=donor[1],
                addr2=donor[2]
            )
            if d['name'] in key_dict:
                d['key'] = key_dict[d['name']]
            else:
                # unknown donor, ask for key
                print '? key for "'+d['name'].encode('utf-8')+'" ?'
                print ' ❯',
                d['key'] = key_dict[d['name']] = raw_input().decode('utf8')
                print
                ds['keys'].insert(dict(name=d['name'], key=d['key']))
            print d['date1'].year, d['date1'].month, ':', d['key'].encode('utf-8'),'->',d['party']
            ds['donations'].upsert(d, ['name', 'date1'])
            #print date1, amount,'-->', party.encode('utf-8')


def read_csv():
    donations = csv.reader(open('spenden.csv'), dialect='excel-tab')
    donations.next()

    for row in donations:
        e = dict(
            party=row[0].decode('utf-8').strip(),
            amount=float(row[1]),
            name=row[2].decode('utf-8'),
            key=row[3].decode('utf-8'),
            addr1=row[4].decode('utf-8'),
            addr2=row[5].decode('utf-8'),
            date1=parse_date(row[7], row),
            date2=parse_date(row[8], row)
        )
        if e['date2'].year < 2009:
            ds['donations'].upsert(e, ['name', 'date1'])
            # print e['date1'], e['amount'], '-->', e['party'].encode('utf-8')
        key_dict[e['name']] = e['key']
        ds['keys'].upsert(dict(key=e['key'], name=e['name']), ['name'])


load_keys()
read_csv()
scrape_online()