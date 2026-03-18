import sys, re, json
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

html = open('data/raw/tripadvisor/moscow/d691623-Cafe_Pushkin-Moscow_Central_Russia.html', encoding='utf-8').read()
print(f'HTML len: {len(html)}')

# 1. og:description
m = re.search(r'<meta\s+(?:property|name)="og:description"\s+content="([^"]*)"', html, re.IGNORECASE)
if m:
    print(f'\n=== og:description ===\n{m.group(1)[:300]}')

# 2. Ищем "description" в JSON
for m in re.finditer(r'"description"\s*:\s*"([^"]{50,500})"', html):
    text = m.group(1).replace('\\n', '\n').replace('\\u0026', '&')
    print(f'\n=== JSON description ===\n{text[:300]}')
    break

# 3. Ищем aboutSection / restaurantDetail
for key in ['aboutSection', 'restaurantDetail', 'amenities', 'detailCard']:
    count = html.count(f'"{key}"')
    if count:
        print(f'\n  Key "{key}": {count} occurrences')

# 4. Ищем ПОДРОБНЕЕ / О РЕСТОРАНЕ секции
for label in ['ПОДРОБНЕЕ', 'О РЕСТОРАНЕ', 'О ресторане', 'Подробнее']:
    idx = html.find(label)
    if idx >= 0:
        chunk = html[idx:idx+2000]
        clean = re.sub(r'<[^>]+>', '|', chunk)
        print(f'\n=== "{label}" section ===\n{clean[:500]}')

# 5. Ищем tag-секцию с фичами (Особенности, Питание, Функции)
for label in ['Особенности', 'ОСОБЕННОСТИ', 'Питание', 'Функции', 'Удобства']:
    idx = html.find(label)
    if idx >= 0:
        chunk = html[idx:idx+3000]
        clean = re.sub(r'<[^>]+>', '|', chunk)
        # Убираем пустые разделители
        clean = re.sub(r'\|+', ' | ', clean)
        print(f'\n=== "{label}" section ===\n{clean[:600]}')
