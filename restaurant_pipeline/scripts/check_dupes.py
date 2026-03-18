"""Analyze duplicates across all sources, distinguishing chains from real dupes."""
import sqlite3, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

conn = sqlite3.connect('data/processed/pipeline.db', timeout=10)

marked = conn.execute('SELECT COUNT(*) FROM restaurants WHERE is_duplicate=1').fetchone()[0]
active = conn.execute('SELECT COUNT(*) FROM restaurants WHERE is_duplicate=0').fetchone()[0]

print('=== АНАЛИЗ ДУБЛИКАТОВ ===')
print('Ищем одно заведение из разных источников.')
print('Филиалы/сети (разные адреса) НЕ считаем дубликатами.\n')
print(f'Всего: {active + marked:,} (активных {active:,}, помечено дубл. {marked:,})\n')

# 1. Точные: имя + адрес + город
print('--- 1. Точные дубликаты: имя + адрес + город (разные источники) ---')
exact = conn.execute(
    "SELECT COUNT(*) FROM ("
    "  SELECT 1 FROM restaurants"
    "  WHERE is_duplicate=0 AND name IS NOT NULL"
    "    AND address IS NOT NULL AND address!='' AND city IS NOT NULL"
    "  GROUP BY LOWER(TRIM(name)), LOWER(TRIM(address)), LOWER(TRIM(city))"
    "  HAVING COUNT(DISTINCT source) > 1"
    ")"
).fetchone()[0]

extra = conn.execute(
    "SELECT SUM(cnt-1) FROM ("
    "  SELECT COUNT(*) as cnt FROM restaurants"
    "  WHERE is_duplicate=0 AND name IS NOT NULL"
    "    AND address IS NOT NULL AND address!='' AND city IS NOT NULL"
    "  GROUP BY LOWER(TRIM(name)), LOWER(TRIM(address)), LOWER(TRIM(city))"
    "  HAVING COUNT(DISTINCT source) > 1"
    ")"
).fetchone()[0] or 0

print(f'  Групп дубликатов: {exact:,}')
print(f'  Лишних записей (можно пометить): {extra:,}')

examples = conn.execute(
    "SELECT LOWER(TRIM(name)) as n, address, city,"
    "  GROUP_CONCAT(DISTINCT source) as srcs, COUNT(*) as cnt"
    " FROM restaurants"
    " WHERE is_duplicate=0 AND name IS NOT NULL"
    "   AND address IS NOT NULL AND address!='' AND city IS NOT NULL"
    " GROUP BY n, LOWER(TRIM(address)), LOWER(TRIM(city))"
    " HAVING COUNT(DISTINCT source) > 1"
    " ORDER BY cnt DESC LIMIT 15"
).fetchall()
print('  Примеры:')
for r in examples:
    print(f'    [{r[3]}] {r[0]} | {r[1]} | {r[2]} (x{r[4]})')

# 2. Между какими источниками
print('\n--- 2. Между какими источниками ---')
pairs = conn.execute(
    "SELECT srcs, COUNT(*) as cnt FROM ("
    "  SELECT GROUP_CONCAT(DISTINCT source) as srcs"
    "  FROM restaurants"
    "  WHERE is_duplicate=0 AND name IS NOT NULL"
    "    AND address IS NOT NULL AND address!='' AND city IS NOT NULL"
    "  GROUP BY LOWER(TRIM(name)), LOWER(TRIM(address)), LOWER(TRIM(city))"
    "  HAVING COUNT(DISTINCT source) > 1"
    ") GROUP BY srcs ORDER BY cnt DESC"
).fetchall()
for r in pairs:
    print(f'    {r[0]:50s} {r[1]:>5,}')

# 3. Внутри одного источника
print('\n--- 3. Внутри одного источника (имя + адрес + город) ---')
for src in ['legacy', 'osm', 'restoclub', 'afisha']:
    intra = conn.execute(
        "SELECT COUNT(*) FROM ("
        "  SELECT 1 FROM restaurants"
        "  WHERE is_duplicate=0 AND source=? AND name IS NOT NULL"
        "    AND address IS NOT NULL AND address!='' AND city IS NOT NULL"
        "  GROUP BY LOWER(TRIM(name)), LOWER(TRIM(address)), LOWER(TRIM(city))"
        "  HAVING COUNT(*) > 1"
        ")", (src,)
    ).fetchone()[0]
    extra_intra = 0
    if intra > 0:
        extra_intra = conn.execute(
            "SELECT SUM(cnt-1) FROM ("
            "  SELECT COUNT(*) as cnt FROM restaurants"
            "  WHERE is_duplicate=0 AND source=? AND name IS NOT NULL"
            "    AND address IS NOT NULL AND address!='' AND city IS NOT NULL"
            "  GROUP BY LOWER(TRIM(name)), LOWER(TRIM(address)), LOWER(TRIM(city))"
            "  HAVING COUNT(*) > 1"
            ")", (src,)
        ).fetchone()[0] or 0
    print(f'    {src:12s} {intra:>5} групп, {extra_intra:>5} лишних')

# 4. Имя + город: сети vs дубликаты
print('\n--- 4. Имя + город (включая сети) ---')
name_city_total = conn.execute(
    "SELECT COUNT(*) FROM ("
    "  SELECT 1 FROM restaurants"
    "  WHERE is_duplicate=0 AND name IS NOT NULL AND city IS NOT NULL"
    "  GROUP BY LOWER(TRIM(name)), LOWER(TRIM(city))"
    "  HAVING COUNT(DISTINCT source) > 1"
    ")"
).fetchone()[0]

# С одним адресом = реальный дубликат, с разными = филиалы
real_dupes_namecity = conn.execute(
    "SELECT COUNT(*) FROM ("
    "  SELECT LOWER(TRIM(name)) as n, LOWER(TRIM(city)) as c,"
    "    COUNT(DISTINCT COALESCE(LOWER(TRIM(address)),'')) as addr_cnt"
    "  FROM restaurants"
    "  WHERE is_duplicate=0 AND name IS NOT NULL AND city IS NOT NULL"
    "  GROUP BY n, c"
    "  HAVING COUNT(DISTINCT source) > 1 AND addr_cnt = 1"
    ")"
).fetchone()[0]

print(f'  Всего групп с одинаковым именем+городом из разных источников: {name_city_total:,}')
print(f'  Один адрес (реальные дубликаты): {real_dupes_namecity:,}')
print(f'  Разные адреса (сети/филиалы): {name_city_total - real_dupes_namecity:,}')

# 5. Топ сетей (одно имя, много адресов в одном городе)
print('\n--- 5. Крупнейшие сети (одно имя, разные адреса в городе) ---')
chains = conn.execute(
    "SELECT name, city, COUNT(DISTINCT address) as branches, COUNT(*) as total_records"
    " FROM restaurants"
    " WHERE is_duplicate=0 AND name IS NOT NULL AND city IS NOT NULL"
    "   AND address IS NOT NULL AND address!=''"
    " GROUP BY LOWER(TRIM(name)), LOWER(TRIM(city))"
    " HAVING COUNT(DISTINCT address) >= 5"
    " ORDER BY branches DESC"
    " LIMIT 20"
).fetchall()
for r in chains:
    print(f'    {r[0]:30s} {r[1]:20s} {r[2]:>3} филиалов ({r[3]} записей)')

print(f'\n=== ИТОГО ===')
print(f'  Реальных межисточниковых дубликатов (имя+адрес+город): {exact:,} групп, {extra:,} лишних записей')
print(f'  Рекомендация: пометить {extra:,} записей как is_duplicate=1')

conn.close()
