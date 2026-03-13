"""
Обогащение ресторанов OSM-тегами (features).

Повторно запрашивает теги из Overpass API для ресторанов с source='osm',
извлекает фичи (wifi, терраса, доставка и т.д.) и сохраняет в pipeline.db.
"""
import sys
import os
import json
import time

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Добавляем корень pipeline в путь
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import requests
from utils.db import get_connection, log_import
from config.settings import OVERPASS_URLS, OVERPASS_TIMEOUT, OVERPASS_DELAY

# ---------------------------------------------------------------------------
# Маппинг OSM-тегов → фичи
# ---------------------------------------------------------------------------
OSM_FEATURE_MAP = {
    'internet_access': {'values': ['yes', 'free', 'wlan'], 'feature': 'wifi'},
    'outdoor_seating': {'values': ['yes'], 'feature': 'terrace'},
    'air_conditioning': {'values': ['yes'], 'feature': 'ac'},
    'delivery': {'values': ['yes'], 'feature': 'delivery'},
    'smoking': {'values': ['yes', 'separated', 'isolated'], 'feature': 'smoking'},
    'wheelchair': {'values': ['yes', 'limited'], 'feature': 'wheelchair'},
    'dog': {'values': ['yes'], 'feature': 'pet-friendly'},
    'diet:vegan': {'values': ['yes', 'only'], 'feature': 'vegan'},
    'diet:halal': {'values': ['yes', 'only'], 'feature': 'halal'},
    'diet:kosher': {'values': ['yes', 'only'], 'feature': 'kosher'},
    'takeaway': {'values': ['yes'], 'feature': 'takeaway'},
    'highchair': {'values': ['yes'], 'feature': 'kids-menu'},
    'capacity': {'values': None, 'store_as': 'capacity'},
}

BATCH_SIZE = 200


# ---------------------------------------------------------------------------
# Миграция схемы
# ---------------------------------------------------------------------------
def _ensure_columns(conn):
    """Добавить колонки features, raw_osm_tags если их ещё нет."""
    for col in ('features', 'raw_osm_tags'):
        try:
            conn.execute(f"ALTER TABLE restaurants ADD COLUMN {col} TEXT")
            conn.commit()
            print(f"[DB] Добавлена колонка '{col}'")
        except Exception:
            # Колонка уже существует — это ожидаемо
            pass


# ---------------------------------------------------------------------------
# Overpass API
# ---------------------------------------------------------------------------
def _build_batch_query(node_ids: list[str], way_ids: list[str]) -> str:
    """Построить Overpass-запрос для пакета ID."""
    parts = []
    if node_ids:
        parts.append(f"  node(id:{','.join(node_ids)});")
    if way_ids:
        parts.append(f"  way(id:{','.join(way_ids)});")

    body = "\n".join(parts)
    return f"""[out:json][timeout:{OVERPASS_TIMEOUT}];
(
{body}
);
out tags;
"""


def _fetch_overpass(query: str) -> dict | None:
    """Запрос к Overpass API с fallback по серверам."""
    for server_url in OVERPASS_URLS:
        try:
            resp = requests.get(
                server_url,
                params={'data': query},
                timeout=OVERPASS_TIMEOUT,
                headers={"User-Agent": "MenuRest-Pipeline/1.0"},
            )
            if resp.status_code == 429:
                wait = int(resp.headers.get("Retry-After", 30))
                host = server_url.split('/')[2]
                print(f"\n    [!] {host} -> 429, wait {wait}s")
                time.sleep(wait)
                continue
            resp.raise_for_status()
            data = resp.json()
            if data.get('elements') is not None:
                return data
        except Exception as e:
            host = server_url.split('/')[2]
            print(f"\n    [!] {host} -> {type(e).__name__}")
            continue
    return None


# ---------------------------------------------------------------------------
# Извлечение фичей из тегов
# ---------------------------------------------------------------------------
def _extract_features(tags: dict) -> list[str]:
    """Извлечь массив фичей из OSM-тегов."""
    features = []
    for osm_key, mapping in OSM_FEATURE_MAP.items():
        value = tags.get(osm_key)
        if value is None:
            continue
        # capacity — числовое значение, не фича
        if 'store_as' in mapping:
            continue
        allowed = mapping.get('values')
        if allowed and value.lower() in allowed:
            features.append(mapping['feature'])
    return features


def _extract_capacity(tags: dict) -> int | None:
    """Извлечь capacity как число."""
    raw = tags.get('capacity')
    if raw is None:
        return None
    try:
        return int(raw)
    except (ValueError, TypeError):
        return None


# ---------------------------------------------------------------------------
# Основная логика
# ---------------------------------------------------------------------------
def run_osm_features_enrichment():
    """Главная функция: обогащение OSM-ресторанов тегами и фичами."""
    conn = get_connection()
    _ensure_columns(conn)

    # Получить рестораны без raw_osm_tags
    rows = conn.execute(
        "SELECT id, source_id FROM restaurants "
        "WHERE source = 'osm' AND raw_osm_tags IS NULL AND source_id IS NOT NULL"
    ).fetchall()

    total = len(rows)
    if total == 0:
        print("[OSM Features] Все рестораны уже обогащены, нечего делать.")
        conn.close()
        return

    print(f"\n{'='*60}")
    print(f"OSM FEATURES ENRICHMENT: {total} ресторанов без тегов")
    print(f"{'='*60}\n")

    log_import('osm', 'features_enrichment', 'started')

    # Индекс id → source_id для быстрого доступа
    id_map = {row['source_id']: row['id'] for row in rows}
    source_ids = list(id_map.keys())

    updated_count = 0
    batch_num = 0

    for i in range(0, len(source_ids), BATCH_SIZE):
        batch = source_ids[i:i + BATCH_SIZE]
        batch_num += 1

        # Разделяем node и way ID (по умолчанию запрашиваем оба типа)
        # Поскольку мы не знаем тип, запрашиваем как node и как way
        query = _build_batch_query(node_ids=batch, way_ids=batch)

        print(
            f"  Batch {batch_num}: IDs {i+1}-{min(i+BATCH_SIZE, len(source_ids))} "
            f"из {len(source_ids)}...",
            end=" ",
            flush=True,
        )

        data = _fetch_overpass(query)
        if data is None:
            print("ОШИБКА (все серверы недоступны)")
            continue

        elements = data.get('elements', [])
        # Индексируем по ID (может прийти и node, и way с одним ID — берём первый с тегами)
        tags_by_id: dict[str, dict] = {}
        for el in elements:
            eid = str(el.get('id', ''))
            if eid and eid not in tags_by_id:
                tags_by_id[eid] = el.get('tags', {})

        batch_updated = 0
        for sid in batch:
            db_id = id_map[sid]
            tags = tags_by_id.get(sid, {})

            raw_tags_json = json.dumps(tags, ensure_ascii=False) if tags else '{}'

            # Фичи
            features = _extract_features(tags)
            features_json = json.dumps(features, ensure_ascii=False) if features else '[]'

            # Booleans
            has_wifi = 1 if 'wifi' in features else 0
            has_delivery = 1 if 'delivery' in features else 0

            conn.execute(
                """UPDATE restaurants
                   SET raw_osm_tags = ?,
                       features = ?,
                       has_wifi = CASE WHEN ? = 1 THEN 1 ELSE has_wifi END,
                       has_delivery = CASE WHEN ? = 1 THEN 1 ELSE has_delivery END,
                       updated_at = datetime('now')
                   WHERE id = ?""",
                (raw_tags_json, features_json, has_wifi, has_delivery, db_id),
            )
            batch_updated += 1

        conn.commit()
        updated_count += batch_updated
        found = len(tags_by_id)
        print(f"OK (найдено тегов: {found}/{len(batch)}, обновлено: {batch_updated})")

        # Пауза между батчами
        if i + BATCH_SIZE < len(source_ids):
            time.sleep(OVERPASS_DELAY)

    # Статистика по фичам
    print(f"\n{'='*60}")
    print(f"OSM FEATURES ENRICHMENT ИТОГО: обновлено {updated_count} из {total}")
    print(f"{'='*60}")

    _print_feature_stats(conn)

    log_import('osm', 'features_enrichment', 'completed', updated_count)
    conn.close()


def _print_feature_stats(conn):
    """Вывести статистику по найденным фичам."""
    row = conn.execute(
        "SELECT COUNT(*) FROM restaurants WHERE source='osm' AND features IS NOT NULL AND features != '[]'"
    ).fetchone()
    with_features = row[0] if row else 0

    row = conn.execute(
        "SELECT COUNT(*) FROM restaurants WHERE source='osm'"
    ).fetchone()
    total_osm = row[0] if row else 0

    print(f"\n  Рестораны с фичами: {with_features} из {total_osm} OSM")

    # Подсчёт по каждой фиче
    row = conn.execute(
        "SELECT features FROM restaurants WHERE source='osm' AND features IS NOT NULL AND features != '[]'"
    ).fetchall()

    feature_counts: dict[str, int] = {}
    for r in row:
        try:
            feats = json.loads(r[0])
            for f in feats:
                feature_counts[f] = feature_counts.get(f, 0) + 1
        except (json.JSONDecodeError, TypeError):
            pass

    if feature_counts:
        print("  Распределение фичей:")
        for feat, count in sorted(feature_counts.items(), key=lambda x: -x[1]):
            print(f"    {feat}: {count}")


if __name__ == '__main__':
    run_osm_features_enrichment()
