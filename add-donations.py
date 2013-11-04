#!/usr/bin/env python
import mysql.connector
import csv
import sys


new_donations_csv = csv.reader(open(sys.argv[1]), dialect='excel-tab')

# expected format: Name, Typ, Strasse, Plz, Stadt, Partei, Betrag
head = new_donations_csv.next()
expected = 'name,typ,strasse,plz,stadt,partei,betrag,jahr'.split(',')
cols = {}
for col in expected:
    for i in range(len(head)):
        if col == head[i].lower():
            cols[col] = i
            break
    if col not in cols:
        print "Error: column '" + col + "' not found in csv file.\n"
        exit(-1)

new_donations = []

for row in new_donations_csv:
    if len(row) > 1:
        donation = {}
        for col in cols:
            donation[col] = row[cols[col]]
        donation['betrag'] = float(donation['betrag'])
        donation['jahr'] = int(donation['jahr'])
        new_donations.append(donation)

print len(new_donations), 'new donations'

# connect to mysql database
conn = mysql.connector.connect()
conn.connect(database='parteispenden10', user='root')
cur = conn.cursor()


def add_donation(donation, donor_id, donor_rev):
    cur = conn.cursor()
    values = (donor_id, donor_rev, donation['partei'], donation['jahr'], donation['betrag'])
    cur.execute('INSERT INTO spenden (spender_id, spender_rev, partei_id, jahr, betrag_euro) VALUES (%s, %s, %s, %s, %s)', values)
    conn.commit()


def add_donor(donor):
    cur = conn.cursor()
    values = (donor['name'], donor['strasse'], donor['plz'], donor['stadt'], donor['typ'])
    cur.execute('INSERT INTO spender (name, strasse, plz, stadt, typ) VALUES (%s, %s, %s, %s, %s)', values)
    conn.commit()
    cur.execute('SELECT LAST_INSERT_ID();')
    last_id = cur.fetchone()[0]
    return last_id


for donation in new_donations:
    q = (donation['name'], donation['stadt'])
    cur.execute('SELECT id, revision FROM spender WHERE name = %s and stadt = %s LIMIT 1', q)
    res = cur.fetchone()
    if res is None:
        donor_id = add_donor(donation)
        donor_rev = 0
    else:
        donor_id, donor_rev = res
    add_donation(donation, donor_id, donor_rev)


exit()
token_count = {}

for donation in new_donations:
    tokens = donation['name'].lower().split(' ')
    for token in tokens:
        if token not in token_count:
            token_count[token] = 0
        token_count[token] += 1

# read known donor tokens
cur.execute('SELECT spender_id, token FROM spender_token')
known_token = []
for spender_id, token in cur:
    token = token.lower()
    if token not in token_count:
        token_count[token] = 0
    token_count[token] += 1

tmp = []
for token in token_count:
    tmp.append((token, token_count[token]))
tmp = sorted(tmp, key=lambda r: r[1])




