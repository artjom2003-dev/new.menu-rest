import sys, sqlite3, json
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

conn = sqlite3.connect('data/processed/tripadvisor.db')
conn.row_factory = sqlite3.Row

rows = conn.execute('SELECT name, city, address, rating, review_count, phone, cuisine, price_range, features FROM restaurants').fetchall()
for r in rows:
    print(f'{r["name"]}')
    print(f'  City: {r["city"]}, Rating: {r["rating"]}, Reviews: {r["review_count"]}')
    print(f'  Address: {r["address"]}')
    print(f'  Phone: {r["phone"]}')
    print(f'  Cuisine: {r["cuisine"]}')
    print(f'  Price: {r["price_range"]}')
    print(f'  Features: {r["features"][:80]}')
    print()

photos = conn.execute('SELECT COUNT(*) as cnt FROM photos').fetchone()
print(f'Total photos: {photos[0]}')

wh = conn.execute('SELECT COUNT(*) as cnt FROM working_hours').fetchone()
print(f'Total working_hours rows: {wh[0]}')

cuisines = conn.execute('SELECT COUNT(*) as cnt FROM cuisines').fetchone()
print(f'Total cuisines: {cuisines[0]}')

conn.close()
