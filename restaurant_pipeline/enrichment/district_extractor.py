"""
Извлечение районов из адресов ресторанов.
Заполняет таблицу districts и связывает рестораны с районами.
"""
import sys
import os
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import re
from utils.db import get_connection, log_import

# ── Предустановленные районы ──────────────────────────────────────────

MOSCOW_DISTRICTS = {
    # Административные округа
    'ЦАО': 'cao', 'САО': 'sao', 'СВАО': 'svao', 'ВАО': 'vao',
    'ЮВАО': 'yuvao', 'ЮАО': 'yuao', 'ЮЗАО': 'yuzao',
    'ЗАО': 'zao', 'СЗАО': 'szao', 'ЗелАО': 'zelao',
    'ТиНАО': 'tinao', 'НАО': 'nao',
    # Основные районы
    'Тверской': 'tverskoy', 'Арбат': 'arbat', 'Пресненский': 'presnenskiy',
    'Замоскворечье': 'zamoskvorechye', 'Якиманка': 'yakimanka',
    'Хамовники': 'hamovniki', 'Басманный': 'basmannyy',
    'Таганский': 'taganskiy', 'Китай-город': 'kitay-gorod',
    'Мещанский': 'meshchanskiy', 'Красносельский': 'krasnoselskiy-msk',
    'Дорогомилово': 'dorogomilovo', 'Раменки': 'ramenki',
    'Гагаринский': 'gagarinskiy', 'Академический': 'akademicheskiy',
    'Даниловский': 'danilovskiy', 'Донской': 'donskoy',
    'Лефортово': 'lefortovo', 'Марьина Роща': 'marina-roshcha',
    'Аэропорт': 'aeroport', 'Сокол': 'sokol',
    'Беговой': 'begovoy', 'Савёловский': 'savelovskiy',
    'Тимирязевский': 'timiryazevskiy', 'Останкинский': 'ostankinskiy',
    'Алексеевский': 'alekseevskiy', 'Бутырский': 'butyrskiy',
    'Сокольники': 'sokolniki', 'Преображенское': 'preobrazhenskoe',
    'Измайлово': 'izmaylovo', 'Перово': 'perovo',
    'Кузьминки': 'kuzminki', 'Люблино': 'lyublino',
    'Марьино': 'maryino', 'Братеево': 'brateevo',
    'Нагатино-Садовники': 'nagatino-sadovniki', 'Чертаново': 'chertanovo',
    'Ясенево': 'yasenevo', 'Тёплый Стан': 'teplyy-stan',
    'Черёмушки': 'cheryomushki', 'Коньково': 'konkovo',
    'Фили-Давыдково': 'fili-davydkovo', 'Крылатское': 'krylatskoe',
    'Строгино': 'strogino', 'Митино': 'mitino',
    'Тушино': 'tushino', 'Куркино': 'kurkino',
    'Зеленоград': 'zelenograd',
}

SPB_DISTRICTS = {
    'Адмиралтейский': 'admiralteyskiy', 'Василеостровский': 'vasileostrovsky',
    'Выборгский': 'vyborgskiy', 'Калининский': 'kalininskiy',
    'Кировский': 'kirovskiy-spb', 'Колпинский': 'kolpinskiy',
    'Красногвардейский': 'krasnogvardeyskiy', 'Красносельский': 'krasnoselskiy-spb',
    'Кронштадтский': 'kronshtadtskiy', 'Курортный': 'kurortnyy',
    'Московский': 'moskovskiy-spb', 'Невский': 'nevskiy',
    'Петроградский': 'petrogradskiy', 'Петродворцовый': 'petrodvortsovyy',
    'Приморский': 'primorskiy', 'Пушкинский': 'pushkinskiy',
    'Фрунзенский': 'frunzenskiy', 'Центральный': 'centralnyy-spb',
}

# Regex для извлечения района из адреса
DISTRICT_PATTERNS = [
    re.compile(r'(?:район|р-н|р\.)\s+([А-ЯЁа-яё\-]+(?:\s+[А-ЯЁа-яё\-]+)?)', re.IGNORECASE),
    re.compile(r'([А-ЯЁа-яё\-]+(?:\s+[А-ЯЁа-яё\-]+)?)\s+(?:район|р-н)', re.IGNORECASE),
]


def _get_or_create_city_id(conn, city_name):
    """Найти city_id по имени."""
    row = conn.execute(
        "SELECT id FROM cities WHERE name = ? OR name LIKE ?",
        (city_name, f'%{city_name}%')
    ).fetchone()
    return row[0] if row else None


def _insert_districts(conn, districts_dict, city_id):
    """Вставить районы для города, возвращает dict name -> id."""
    result = {}
    for name, slug in districts_dict.items():
        existing = conn.execute(
            "SELECT id FROM districts WHERE slug = ?", (slug,)
        ).fetchone()
        if existing:
            result[name] = existing[0]
        else:
            cur = conn.execute(
                "INSERT INTO districts (name, slug, city_id) VALUES (?, ?, ?)",
                (name, slug, city_id)
            )
            result[name] = cur.lastrowid
    return result


def _match_district(address, district_names):
    """Проверить, содержит ли адрес название района. Возвращает имя района или None."""
    if not address:
        return None
    addr_lower = address.lower()
    # Сначала проверяем более длинные названия (чтобы "Марьина Роща" шёл раньше "Марьино")
    sorted_names = sorted(district_names, key=len, reverse=True)
    for name in sorted_names:
        if name.lower() in addr_lower:
            return name
    return None


def _extract_generic_district(address):
    """Извлечь район из адреса по паттернам (для не-столичных городов)."""
    if not address:
        return None
    for pattern in DISTRICT_PATTERNS:
        m = pattern.search(address)
        if m:
            return m.group(1).strip()
    return None


def run_district_extractor():
    """Основная функция: извлечение районов и привязка к ресторанам."""
    print("\n[District Extractor] Извлечение районов из адресов...")
    log_import('enrichment', 'district_extractor', 'started')

    conn = get_connection()

    # Убедимся что таблица districts существует
    conn.execute("""
        CREATE TABLE IF NOT EXISTS districts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            slug TEXT UNIQUE,
            city_id INTEGER REFERENCES cities(id)
        )
    """)

    # Убедимся что колонка district_id существует
    cols = [row[1] for row in conn.execute("PRAGMA table_info(restaurants)").fetchall()]
    if 'district_id' not in cols:
        conn.execute("ALTER TABLE restaurants ADD COLUMN district_id INTEGER REFERENCES districts(id)")

    conn.commit()

    # ── 1. Найти city_id для Москвы и СПб ──
    moscow_city_id = _get_or_create_city_id(conn, 'Москва')
    spb_city_id = _get_or_create_city_id(conn, 'Санкт-Петербург')

    print(f"  Moscow city_id: {moscow_city_id}")
    print(f"  SPb city_id: {spb_city_id}")

    # ── 2. Вставить предустановленные районы ──
    moscow_district_map = {}
    spb_district_map = {}

    if moscow_city_id:
        moscow_district_map = _insert_districts(conn, MOSCOW_DISTRICTS, moscow_city_id)
        print(f"  Районы Москвы: {len(moscow_district_map)}")

    if spb_city_id:
        spb_district_map = _insert_districts(conn, SPB_DISTRICTS, spb_city_id)
        print(f"  Районы СПб: {len(spb_district_map)}")

    conn.commit()

    # ── 3. Привязка ресторанов к районам ──
    restaurants = conn.execute(
        "SELECT id, address, city_id, city FROM restaurants WHERE is_duplicate = 0"
    ).fetchall()

    matched = 0
    matched_moscow = 0
    matched_spb = 0
    matched_generic = 0

    for rest in restaurants:
        rest_id = rest[0]
        address = rest[1]
        rest_city_id = rest[2]
        rest_city = rest[3] or ''

        if not address:
            continue

        district_id = None

        # Москва
        if (rest_city_id == moscow_city_id and moscow_city_id) or 'москва' in rest_city.lower():
            name = _match_district(address, moscow_district_map.keys())
            if name:
                district_id = moscow_district_map[name]
                matched_moscow += 1

        # Санкт-Петербург
        elif (rest_city_id == spb_city_id and spb_city_id) or 'петербург' in rest_city.lower():
            name = _match_district(address, spb_district_map.keys())
            if name:
                district_id = spb_district_map[name]
                matched_spb += 1

        # Другие города — попытка извлечь по паттерну
        else:
            generic_name = _extract_generic_district(address)
            if generic_name:
                # Транслитерация для slug
                slug = generic_name.lower().replace(' ', '-')
                # Проверяем/создаём район
                existing = conn.execute(
                    "SELECT id FROM districts WHERE name = ? AND city_id = ?",
                    (generic_name, rest_city_id)
                ).fetchone()
                if existing:
                    district_id = existing[0]
                elif rest_city_id:
                    # Создаём slug уникальный с city_id
                    unique_slug = f"{slug}-city{rest_city_id}"
                    exists_slug = conn.execute(
                        "SELECT id FROM districts WHERE slug = ?", (unique_slug,)
                    ).fetchone()
                    if exists_slug:
                        district_id = exists_slug[0]
                    else:
                        cur = conn.execute(
                            "INSERT INTO districts (name, slug, city_id) VALUES (?, ?, ?)",
                            (generic_name, unique_slug, rest_city_id)
                        )
                        district_id = cur.lastrowid
                if district_id:
                    matched_generic += 1

        if district_id:
            conn.execute(
                "UPDATE restaurants SET district_id = ? WHERE id = ?",
                (district_id, rest_id)
            )
            matched += 1

    conn.commit()

    # ── 4. Статистика ──
    total_districts = conn.execute("SELECT COUNT(*) FROM districts").fetchone()[0]
    total_restaurants = conn.execute(
        "SELECT COUNT(*) FROM restaurants WHERE is_duplicate = 0"
    ).fetchone()[0]

    print(f"\n  [District Extractor] Результаты:")
    print(f"    Всего районов в БД: {total_districts}")
    print(f"    Ресторанов с районом: {matched} / {total_restaurants}")
    print(f"      - Москва: {matched_moscow}")
    print(f"      - СПб: {matched_spb}")
    print(f"      - Другие города: {matched_generic}")

    log_import('enrichment', 'district_extractor', 'completed', matched)
    conn.close()
    print("  [District Extractor] Готово.")


if __name__ == '__main__':
    run_district_extractor()
