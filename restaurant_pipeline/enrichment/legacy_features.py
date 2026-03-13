"""
Извлечение фич из legacy данных.
Маппит has_wifi, has_delivery и другие поля в JSON features.
Также анализирует description и name для дополнительных фич.
"""
import sys
import os
import json
import re
import sqlite3

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from utils.db import get_connection, log_import


# Ключевые слова для определения фич из описания/названия
FEATURE_KEYWORDS = {
    'wifi': ['wi-fi', 'wifi', 'вай-фай', 'бесплатный интернет'],
    'terrace': ['терраса', 'веранда', 'летняя площадка', 'на открытом воздухе'],
    'delivery': ['доставка', 'delivery', 'привозим'],
    'parking': ['парковка', 'стоянка', 'parking'],
    'kids-menu': ['детское меню', 'kids menu', 'для детей'],
    'kids-room': ['детская комната', 'детский уголок', 'игровая'],
    'hookah': ['кальян', 'hookah', 'shisha'],
    'live-music': ['живая музыка', 'live music', 'концерт'],
    'business-lunch': ['бизнес-ланч', 'бизнес ланч', 'business lunch', 'комплексный обед'],
    'banquet': ['банкет', 'свадьба', 'юбилей', 'торжество', 'мероприятие'],
    'vegan': ['веган', 'vegan', 'растительное меню'],
    'halal': ['халяль', 'halal', 'халял'],
    'kosher': ['кошер', 'kosher'],
    'ac': ['кондиционер', 'air conditioning'],
    'pet-friendly': ['с животными', 'pet-friendly', 'dog-friendly', 'собаками'],
    'smoking': ['для курящих', 'курительная', 'smoking'],
    'romantic': ['романтик', 'romantic', 'свидание', 'для двоих'],
    'dancefloor': ['танцпол', 'дискотека', 'танцы'],
    'projector': ['проектор', 'экран', 'трансляция матч'],
    'rooftop': ['крыша', 'rooftop', 'на крыше'],
    'with-view': ['с видом', 'панорам', 'обзор'],
}


def _ensure_features_column(conn: sqlite3.Connection):
    """Убедиться что колонка features существует."""
    try:
        conn.execute("ALTER TABLE restaurants ADD COLUMN features TEXT")
    except sqlite3.OperationalError:
        pass  # column already exists


def _extract_features_from_text(text: str) -> set[str]:
    """Извлечь фичи из текста (описание или название)."""
    if not text:
        return set()
    text_lower = text.lower()
    found = set()
    for feature_slug, keywords in FEATURE_KEYWORDS.items():
        for kw in keywords:
            if kw in text_lower:
                found.add(feature_slug)
                break
    return found


def run_legacy_features():
    """Извлечение фич из существующих данных ресторанов."""
    print("\n[Enrichment] Извлечение фич из legacy данных...")

    conn = get_connection()
    _ensure_features_column(conn)

    # Получить все не-дубликатные рестораны
    restaurants = conn.execute("""
        SELECT id, name, description, has_wifi, has_delivery, features
        FROM restaurants
        WHERE is_duplicate = 0
    """).fetchall()

    print(f"  Ресторанов для анализа: {len(restaurants)}")

    updated = 0
    feature_counts = {}

    for r in restaurants:
        rid = r[0]
        name = r[1]
        description = r[2]
        has_wifi = r[3]
        has_delivery = r[4]
        existing_features_json = r[5]

        # Начать с существующих фич
        features = set()
        if existing_features_json:
            try:
                existing = json.loads(existing_features_json)
                if isinstance(existing, list):
                    features = set(existing)
            except (json.JSONDecodeError, TypeError):
                pass

        # Добавить из boolean полей
        if has_wifi:
            features.add('wifi')
        if has_delivery:
            features.add('delivery')

        # Извлечь из описания
        features |= _extract_features_from_text(description)

        # Извлечь из названия
        features |= _extract_features_from_text(name)

        if not features:
            continue

        # Обновить
        features_list = sorted(features)
        features_json = json.dumps(features_list, ensure_ascii=False)

        if features_json != existing_features_json:
            try:
                conn.execute(
                    "UPDATE restaurants SET features = ? WHERE id = ?",
                    (features_json, rid)
                )
                updated += 1
                for f in features_list:
                    feature_counts[f] = feature_counts.get(f, 0) + 1
            except Exception as e:
                if updated < 5:
                    print(f"  [!] {name}: {e}")

    conn.commit()
    conn.close()

    print(f"  -> {updated} ресторанов обновлено")
    if feature_counts:
        print("  Распределение фич:")
        for slug, cnt in sorted(feature_counts.items(), key=lambda x: -x[1]):
            print(f"    {slug:20s}: {cnt:6d}")

    log_import('enrichment', 'legacy_features', 'completed', updated)


if __name__ == '__main__':
    run_legacy_features()
