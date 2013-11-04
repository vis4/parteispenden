import dataset
import csv

out = csv.writer(open('circle/donations.csv', 'w'), dialect='excel-tab')
ds = dataset.connect('sqlite:///donations.db')

out.writerow('party,donation,donor_name,donor_key,addr1,addr2,date1,date2'.split(','))

for d in ds.query('SELECT * FROM donations ORDER BY date1 DESC'):
    out.writerow([
        d['party'].strip().encode('utf-8'),
        d['key'].strip().encode('utf-8'),
        d['amount'],
        d['name'].strip().encode('utf-8'),
        d['addr1'].strip().encode('utf-8'),
        d['addr2'].strip().encode('utf-8'),
        d['date1'],
        d['date2']
    ])


