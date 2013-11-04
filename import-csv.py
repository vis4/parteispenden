
import csv
from datetime import date
from hashlib import md5

import dataset

# import donations from old csv format

ds = dataset.connect('sqlite:///donations.db')

data = csv.reader(open('parteispenden.csv'), dialect='excel-tab')
data.next()


def to_date(s):
    parts = map(int, s.split('.'))
    return date(parts[2]+2000, parts[1], parts[0])

def fmt(s):
    return s.strip().decode('utf-8')


for row in data:
    d = dict(
        uid=md5('|'.join(row)).hexdigest(),
        party=fmt(row[0]),
        amount=float(row[1]),
        donor=fmt(row[2]),
        donor_key=fmt(row[3]),
        donor_street=fmt(row[4]),
        donor_city=fmt(row[5]),
        donor_country=fmt(row[6]),
        date_donation=to_date(row[7]),
        date_publication=to_date(row[8]),
        legislativ_period=int(row[9])
    )
    ds['donations'].upsert(d, ['uid'])
