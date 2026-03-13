"""
Генерация описаний для ресторанов без описания.
Использует имеющиеся данные: название, город, кухня, тип, цена, фичи.
"""
import sys
import os
import json
import sqlite3
import random

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from utils.db import get_connection, log_import


# Шаблоны описаний по типу заведения
TEMPLATES = {
    'restaurant': [
        '{name} — ресторан{cuisine_phrase}{city_phrase}.{feature_phrase}{price_phrase}',
        'Ресторан {name}{city_phrase}{cuisine_phrase}.{feature_phrase}{price_phrase}',
    ],
    'cafe': [
        '{name} — кафе{cuisine_phrase}{city_phrase}.{feature_phrase}{price_phrase}',
        'Кафе {name}{city_phrase}{cuisine_phrase}.{feature_phrase}{price_phrase}',
    ],
    'fast_food': [
        '{name} — заведение быстрого питания{cuisine_phrase}{city_phrase}.{feature_phrase}{price_phrase}',
        '{name}{city_phrase} — фастфуд{cuisine_phrase}.{feature_phrase}{price_phrase}',
    ],
    'bar': [
        '{name} — бар{cuisine_phrase}{city_phrase}.{feature_phrase}{price_phrase}',
        'Бар {name}{city_phrase}{cuisine_phrase}.{feature_phrase}{price_phrase}',
    ],
    'pub': [
        '{name} — паб{cuisine_phrase}{city_phrase}.{feature_phrase}{price_phrase}',
        'Паб {name}{city_phrase}{cuisine_phrase}.{feature_phrase}{price_phrase}',
    ],
}

# Маппинг кухонь для фразы
CUISINE_PHRASES = {
    'japanese': 'японской',
    'italian': 'итальянской',
    'chinese': 'китайской',
    'french': 'французской',
    'georgian': 'грузинской',
    'uzbek': 'узбекской',
    'thai': 'тайской',
    'indian': 'индийской',
    'korean': 'корейской',
    'mexican': 'мексиканской',
    'american': 'американской',
    'european': 'европейской',
    'russian': 'русской',
    'mediterranean': 'средиземноморской',
    'asian': 'азиатской',
    'vietnamese': 'вьетнамской',
    'turkish': 'турецкой',
    'armenian': 'армянской',
    'azerbaijani': 'азербайджанской',
    'caucasian': 'кавказской',
    'pan_asian': 'паназиатской',
    'seafood': 'с акцентом на морепродукты',
    'sushi': 'японской',
    'pizza': 'итальянской',
    'burger': 'с акцентом на бургеры',
    'steak': 'с акцентом на стейки',
    'vegetarian': 'вегетарианской',
    'vegan': 'веганской',
}

# Русские названия кухонь из legacy
CUISINE_PHRASES_RU = {
    'японская': 'японской',
    'итальянская': 'итальянской',
    'китайская': 'китайской',
    'французская': 'французской',
    'грузинская': 'грузинской',
    'узбекская': 'узбекской',
    'тайская': 'тайской',
    'индийская': 'индийской',
    'корейская': 'корейской',
    'мексиканская': 'мексиканской',
    'американская': 'американской',
    'европейская': 'европейской',
    'русская': 'русской',
    'средиземноморская': 'средиземноморской',
    'азиатская': 'азиатской',
    'вьетнамская': 'вьетнамской',
    'турецкая': 'турецкой',
    'армянская': 'армянской',
    'азербайджанская': 'азербайджанской',
    'кавказская': 'кавказской',
    'паназиатская': 'паназиатской',
    'восточная': 'восточной',
    'домашняя': 'домашней',
    'авторская': 'авторской',
    'интернациональная': 'интернациональной',
    'грильная': 'гриль',
    'рыбная': 'рыбной',
    'мясная': 'мясной',
}

PRICE_PHRASES = {
    '₽': ' Демократичные цены.',
    '₽₽': ' Средний ценовой сегмент.',
    '₽₽₽': ' Ценовая категория выше среднего.',
    '₽₽₽₽': ' Премиальный ценовой сегмент.',
}


def _get_cuisine_phrase(cuisine_json: str, cuisine_names: list[str]) -> str:
    """Построить фразу о кухне."""
    cuisines = []

    # Из JSON поля (OSM)
    if cuisine_json:
        try:
            raw = json.loads(cuisine_json)
            if isinstance(raw, list):
                cuisines.extend(raw)
        except (json.JSONDecodeError, TypeError):
            pass

    # Из связанных кухонь
    cuisines.extend(cuisine_names)

    if not cuisines:
        return ''

    # Взять первую кухню для фразы
    primary = cuisines[0].lower().strip()

    # Попробовать русский маппинг
    for ru_name, gen_form in CUISINE_PHRASES_RU.items():
        if ru_name in primary:
            return f' {gen_form} кухни'

    # Попробовать английский маппинг
    for en_name, gen_form in CUISINE_PHRASES.items():
        if en_name in primary:
            return f' {gen_form} кухни'

    return ''


def _get_feature_phrase(features_json: str, has_wifi: int, has_delivery: int) -> str:
    """Построить фразу о фичах."""
    parts = []

    if features_json:
        try:
            features = json.loads(features_json)
            if isinstance(features, list):
                feature_map = {
                    'wifi': 'Wi-Fi',
                    'terrace': 'летняя терраса',
                    'delivery': 'доставка',
                    'parking': 'парковка',
                    'ac': 'кондиционер',
                    'kids-menu': 'детское меню',
                    'hookah': 'кальян',
                    'live-music': 'живая музыка',
                    'vegan': 'веганское меню',
                    'halal': 'халяль',
                }
                for f in features:
                    if f in feature_map:
                        parts.append(feature_map[f])
        except (json.JSONDecodeError, TypeError):
            pass

    if not parts:
        if has_wifi:
            parts.append('Wi-Fi')
        if has_delivery:
            parts.append('доставка')

    if not parts:
        return ''

    if len(parts) == 1:
        return f' Есть {parts[0]}.'
    elif len(parts) <= 3:
        return f' Есть {", ".join(parts[:-1])} и {parts[-1]}.'
    else:
        shown = parts[:3]
        return f' Есть {", ".join(shown[:-1])} и {shown[-1]}.'


def _detect_amenity_type(name: str, amenity: str = None) -> str:
    """Определить тип заведения по имени и amenity тегу."""
    if amenity and amenity in TEMPLATES:
        return amenity

    name_lower = name.lower()
    if any(w in name_lower for w in ['бар ', ' бар', 'bar', 'лаунж', 'lounge']):
        return 'bar'
    if any(w in name_lower for w in ['паб', 'pub']):
        return 'pub'
    if any(w in name_lower for w in ['кафе', 'cafe', 'кофейня', 'coffee', 'кондитерская', 'пекарня', 'bakery']):
        return 'cafe'
    if any(w in name_lower for w in ['фастфуд', 'fast food', 'бургерная', 'шаурма', 'пиццерия', 'столовая']):
        return 'fast_food'
    return 'restaurant'


def run_description_generator():
    """Генерация описаний для ресторанов без описания."""
    print("\n[Enrichment] Генерация описаний...")

    conn = get_connection()

    # Получить рестораны без описания
    restaurants = conn.execute("""
        SELECT r.id, r.name, r.city, r.cuisine, r.price_range,
               r.features, r.has_wifi, r.has_delivery, r.source
        FROM restaurants r
        WHERE (r.description IS NULL OR r.description = '')
          AND r.is_duplicate = 0
    """).fetchall()

    print(f"  Ресторанов без описания: {len(restaurants)}")

    if not restaurants:
        print("  -> Все рестораны имеют описания")
        return

    # Загрузить связи ресторан-кухня
    cuisine_map = {}
    for row in conn.execute("""
        SELECT rc.restaurant_id, c.name
        FROM restaurant_cuisines rc
        JOIN cuisines c ON c.id = rc.cuisine_id
    """):
        cuisine_map.setdefault(row[0], []).append(row[1])

    count = 0
    for r in restaurants:
        rid = r[0]
        name = r[1]
        city = r[2]
        cuisine_json = r[3]
        price_range = r[4]
        features_json = r[5]
        has_wifi = r[6] or 0
        has_delivery = r[7] or 0

        cuisine_names = cuisine_map.get(rid, [])

        # Определить тип
        amenity_type = _detect_amenity_type(name)

        # Составить фразы
        cuisine_phrase = _get_cuisine_phrase(cuisine_json, cuisine_names)
        city_phrase = f' в городе {city}' if city else ''
        feature_phrase = _get_feature_phrase(features_json, has_wifi, has_delivery)
        price_phrase = PRICE_PHRASES.get(price_range, '')
        cuisine_type = ''
        if cuisine_phrase:
            cuisine_type = cuisine_phrase.strip().replace(' кухни', '') + ' '

        # Выбрать шаблон
        templates = TEMPLATES.get(amenity_type, TEMPLATES['restaurant'])
        template = random.choice(templates)

        description = template.format(
            name=name,
            cuisine_phrase=cuisine_phrase,
            city_phrase=city_phrase,
            feature_phrase=feature_phrase,
            price_phrase=price_phrase,
            cuisine_type=cuisine_type,
        )

        # Убрать двойные пробелы и точки
        description = description.replace('  ', ' ').replace('..', '.').strip()

        try:
            conn.execute(
                "UPDATE restaurants SET description = ? WHERE id = ? AND (description IS NULL OR description = '')",
                (description, rid)
            )
            count += 1
        except Exception as e:
            if count < 5:
                print(f"  [!] {name}: {e}")

    conn.commit()
    conn.close()

    print(f"  -> {count} описаний сгенерировано")
    log_import('enrichment', 'description_generator', 'completed', count)


if __name__ == '__main__':
    run_description_generator()
