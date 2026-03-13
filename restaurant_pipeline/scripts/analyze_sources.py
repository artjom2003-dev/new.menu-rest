"""Анализ доступных источников данных для обогащения."""
import sys
import os
import sqlite3

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

conn = sqlite3.connect(os.path.join(os.path.dirname(__file__), '..', 'data', 'processed', 'pipeline.db'))

print('=== ЧТО У НАС ЕСТЬ ДЛЯ ДОБЫЧИ ДАННЫХ ===\n')

# Websites
sites = conn.execute("SELECT COUNT(*) FROM restaurants WHERE website IS NOT NULL AND website != '' AND is_duplicate=0").fetchone()[0]
print(f'1. Сайты ресторанов: {sites:,} URL-ов')
samples = conn.execute("SELECT website FROM restaurants WHERE website IS NOT NULL AND website != '' AND is_duplicate=0 LIMIT 5").fetchall()
for s in samples:
    print(f'   {s[0]}')

print()

# Descriptions
descs = conn.execute("SELECT COUNT(*) FROM restaurants WHERE source='legacy' AND description IS NOT NULL AND length(description) > 50 AND is_duplicate=0").fetchone()[0]
print(f'2. Подробные описания (legacy): {descs:,}')
sample = conn.execute("SELECT description FROM restaurants WHERE source='legacy' AND length(description) > 100 AND is_duplicate=0 LIMIT 1").fetchone()
if sample:
    print(f'   Пример: {sample[0][:200]}...')

print()

# OSM raw tags
osm_tags = conn.execute("SELECT COUNT(*) FROM restaurants WHERE raw_osm_tags IS NOT NULL AND raw_osm_tags != '' AND is_duplicate=0").fetchone()[0]
print(f'3. OSM raw tags (JSON): {osm_tags:,}')
sample = conn.execute("SELECT raw_osm_tags FROM restaurants WHERE raw_osm_tags IS NOT NULL AND length(raw_osm_tags) > 50 AND is_duplicate=0 LIMIT 3").fetchall()
for s in sample:
    print(f'   {s[0][:150]}')

print()

# Social media
insta = conn.execute("SELECT COUNT(*) FROM restaurants WHERE instagram IS NOT NULL AND instagram != '' AND is_duplicate=0").fetchone()[0]
vk = conn.execute("SELECT COUNT(*) FROM restaurants WHERE vk IS NOT NULL AND vk != '' AND is_duplicate=0").fetchone()[0]
fb = conn.execute("SELECT COUNT(*) FROM restaurants WHERE facebook IS NOT NULL AND facebook != '' AND is_duplicate=0").fetchone()[0]
print(f'4. Соцсети: Instagram {insta:,} | VK {vk:,} | Facebook {fb:,}')

print()

# Cuisine from OSM
print('5. OSM кухни (топ-10):')
osm_cuisine = conn.execute("""
    SELECT cuisine, COUNT(*) FROM restaurants
    WHERE source='osm' AND cuisine IS NOT NULL AND cuisine != '' AND is_duplicate=0
    GROUP BY cuisine ORDER BY COUNT(*) DESC LIMIT 10
""").fetchall()
for c, cnt in osm_cuisine:
    print(f'   {c}: {cnt}')

print()

# Coordinates
with_coords = conn.execute("SELECT COUNT(*) FROM restaurants WHERE lat IS NOT NULL AND is_duplicate=0").fetchone()[0]
total = conn.execute("SELECT COUNT(*) FROM restaurants WHERE is_duplicate=0").fetchone()[0]
print(f'6. Координаты: {with_coords:,} / {total:,} ({with_coords/total*100:.0f}%)')

print()
print('=== LEGACY ПОЛЯ ===')
with_email = conn.execute("SELECT COUNT(*) FROM restaurants WHERE email IS NOT NULL AND email != '' AND is_duplicate=0").fetchone()[0]
print(f'   Email: {with_email:,}')
with_2gis = conn.execute("SELECT COUNT(*) FROM restaurants WHERE external_2gis_id IS NOT NULL AND is_duplicate=0").fetchone()[0]
print(f'   2GIS ID: {with_2gis:,}')
with_comp = conn.execute("SELECT COUNT(*) FROM dishes WHERE composition IS NOT NULL AND composition != ''").fetchone()[0]
total_d = conn.execute("SELECT COUNT(*) FROM dishes").fetchone()[0]
print(f'   Блюда с составом: {with_comp:,} / {total_d:,}')

print()
print('=== OSM ТЕГИ — ЧТО ЕЩЁ МОЖНО ИЗВЛЕЧЬ ===')
# Check what tags exist
import json
tag_counts = {}
rows = conn.execute("SELECT raw_osm_tags FROM restaurants WHERE raw_osm_tags IS NOT NULL AND raw_osm_tags != '' AND is_duplicate=0 LIMIT 5000").fetchall()
for r in rows:
    try:
        tags = json.loads(r[0])
        for k in tags:
            tag_counts[k] = tag_counts.get(k, 0) + 1
    except:
        pass
sorted_tags = sorted(tag_counts.items(), key=lambda x: -x[1])
for tag, cnt in sorted_tags[:30]:
    print(f'   {tag}: {cnt}')

conn.close()
