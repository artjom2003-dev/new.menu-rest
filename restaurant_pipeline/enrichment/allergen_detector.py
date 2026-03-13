"""
Детектор аллергенов для блюд в pipeline.db.

Сканирует название и состав блюда по ключевым словам
и создаёт записи в таблице dish_allergens с severity='may_contain'.

14 аллергенов ЕС: gluten, crustaceans, eggs, fish, peanuts, soy,
milk, nuts, celery, mustard, sesame, sulphites, lupin, molluscs.
"""

import sys
import os
import re
import sqlite3
from typing import List, Tuple

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from utils.db import get_connection, log_import


# ── Allergen keyword rules ─────────────────────────────────────────────────
# Each allergen maps to a list of Russian keyword stems (case-insensitive)

ALLERGEN_KEYWORDS: dict[str, List[str]] = {
    'gluten': [
        'мука', 'хлеб', 'тесто', 'паста', 'пицца', 'блин', 'пельмен',
        'вареник', 'пирог', 'круассан', 'сэндвич', 'сандвич', 'бургер',
        'ролл', 'лапша', 'спагетти', 'пенне', 'фетучин', 'тальятелле',
        'лазань', 'равиоли', 'ньокки', 'хачапури', 'хинкали', 'манты',
        'пшенич', 'ржан', 'ячмен', 'овсян', 'панировк', 'сухар',
        'багет', 'чиабатт', 'фокачч', 'тост', 'кесадиль', 'буррит',
        'тако', 'наггетс', 'темпур', 'хот-дог', 'вафл', 'эклер',
        'штрудель', 'наполеон', 'профитрол', 'пахлав', 'удон', 'соба',
        'рамен', 'пад тай', 'гёза', 'дим-сам', 'спринг-ролл',
        'крокет', 'оладь', 'запеканк', 'гранол',
    ],

    'crustaceans': [
        'креветк', 'краб', 'лобстер', 'омар', 'лангуст', 'раки',
        'раков', 'лангустин',
    ],

    'eggs': [
        'яйц', 'яйк', 'омлет', 'яични', 'майонез', 'безе', 'суфле',
        'скрэмбл', 'бенедикт', 'яичниц', 'глазунь', 'пашот',
    ],

    'fish': [
        'лосос', 'сёмг', 'семг', 'форел', 'тунец', 'тунц', 'судак',
        'дорадо', 'сибас', 'окунь', 'сельд', 'скумбри', 'рыб',
        'угорь', 'палтус', 'треск', 'осетр', 'анчоус', 'сардин',
        'камбал', 'минтай', 'кижуч', 'горбуш', 'нерк', 'хек',
        'сашими', 'нигири',
    ],

    'peanuts': [
        'арахис',
    ],

    'soy': [
        'соев', 'тофу', 'эдамаме', 'мисо', 'соус терияки',
    ],

    'milk': [
        'сыр', 'сливк', 'молок', 'сметан', 'масло сливочн',
        'творог', 'йогурт', 'кефир', 'моцарелл', 'пармезан',
        'камамбер', 'бри ', 'рикотт', 'горгонзол', 'чеддер',
        'маскарпоне', 'сливочн', 'молочн', 'латте', 'капучино',
        'какао', 'раф', 'милкшейк', 'пломбир', 'мороженое',
        'панна котта', 'панна-котта', 'панакота', 'крем-брюле',
        'чизкейк', 'тирамису',
    ],

    'nuts': [
        'орех', 'орешк', 'фундук', 'миндал', 'фисташ', 'кешью',
        'грецк', 'пекан', 'кедров', 'макадами', 'марципан',
    ],

    'celery': [
        'сельдерей', 'сельдере',
    ],

    'mustard': [
        'горчиц', 'горчичн',
    ],

    'sesame': [
        'кунжут',
    ],

    'sulphites': [
        'вино', 'винн',
    ],

    'lupin': [
        'люпин',
    ],

    'molluscs': [
        'устриц', 'мидии', 'мидий', 'кальмар', 'осьминог',
        'морепродукт', 'гребешок', 'гребешк',
    ],
}

# Pre-compile patterns for each allergen
_ALLERGEN_PATTERNS: dict[str, List[re.Pattern]] = {}
for _allergen, _keywords in ALLERGEN_KEYWORDS.items():
    _ALLERGEN_PATTERNS[_allergen] = [
        re.compile(re.escape(kw), re.IGNORECASE) for kw in _keywords
    ]


def _detect_allergens(text: str) -> List[str]:
    """Detect allergen slugs present in text."""
    found = []
    for allergen, patterns in _ALLERGEN_PATTERNS.items():
        for pattern in patterns:
            if pattern.search(text):
                found.append(allergen)
                break
    return found


def run_allergen_detector():
    """Detect allergens for all dishes and populate dish_allergens table."""
    print("[ALLERGENS] Запуск детектора аллергенов...")
    log_import('enrichment', 'allergen_detector', 'started')

    conn = get_connection()
    cur = conn.cursor()

    # Create dish_allergens table
    cur.executescript("""
        CREATE TABLE IF NOT EXISTS dish_allergens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dish_id INTEGER NOT NULL REFERENCES dishes(id),
            allergen_slug TEXT NOT NULL,
            severity TEXT DEFAULT 'may_contain',
            UNIQUE(dish_id, allergen_slug)
        );
        CREATE INDEX IF NOT EXISTS idx_dish_allergens_dish
            ON dish_allergens(dish_id);
        CREATE INDEX IF NOT EXISTS idx_dish_allergens_allergen
            ON dish_allergens(allergen_slug);
    """)
    conn.commit()

    # Clear previous detections (re-run safe)
    cur.execute("DELETE FROM dish_allergens WHERE severity = 'may_contain'")
    conn.commit()

    # Fetch all dishes
    rows = cur.execute("SELECT id, name, composition FROM dishes").fetchall()
    total_dishes = len(rows)

    total_links = 0
    dishes_with_allergens = 0
    allergen_counts: dict[str, int] = {a: 0 for a in ALLERGEN_KEYWORDS}
    dishes_without = 0

    batch: List[Tuple[int, str]] = []

    for row in rows:
        dish_id = row['id']
        name = row['name'] or ''
        composition = row['composition'] or ''
        search_text = f"{name} {composition}"

        allergens = _detect_allergens(search_text)

        if allergens:
            dishes_with_allergens += 1
            for allergen in allergens:
                batch.append((dish_id, allergen))
                allergen_counts[allergen] += 1
                total_links += 1
        else:
            dishes_without += 1

        # Insert in batches of 1000
        if len(batch) >= 1000:
            cur.executemany(
                "INSERT OR IGNORE INTO dish_allergens (dish_id, allergen_slug, severity) "
                "VALUES (?, ?, 'may_contain')",
                batch
            )
            conn.commit()
            batch.clear()

    # Insert remaining
    if batch:
        cur.executemany(
            "INSERT OR IGNORE INTO dish_allergens (dish_id, allergen_slug, severity) "
            "VALUES (?, ?, 'may_contain')",
            batch
        )
        conn.commit()

    conn.close()

    # Stats
    print(f"[ALLERGENS] Результаты:")
    print(f"  Всего блюд: {total_dishes}")
    print(f"  Блюд с аллергенами: {dishes_with_allergens}")
    print(f"  Блюд без аллергенов: {dishes_without}")
    print(f"  Всего связей dish-allergen: {total_links}")
    print(f"  По аллергенам:")
    for allergen, count in sorted(allergen_counts.items(), key=lambda x: -x[1]):
        if count > 0:
            print(f"    {allergen:15s}: {count}")

    log_import('enrichment', 'allergen_detector', 'completed', total_links)
    print("[ALLERGENS] Готово.")


if __name__ == '__main__':
    run_allergen_detector()
