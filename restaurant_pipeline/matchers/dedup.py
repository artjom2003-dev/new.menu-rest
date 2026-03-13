"""
Дедупликация и мержинг ресторанов из разных источников.

Критерии дубликата:
- Расстояние < 200м И
- Сходство названий > 0.85 (rapidfuzz)
"""
import json
import sqlite3
from collections import defaultdict
from haversine import haversine, Unit
from rapidfuzz import fuzz
from tqdm import tqdm
from utils.db import get_connection, log_import
from config.settings import DEDUP_DISTANCE_METERS, DEDUP_NAME_THRESHOLD


def _normalize_name(name: str) -> str:
    """Нормализация названия для сравнения."""
    if not name:
        return ""
    name = name.lower().strip()
    # Убрать кавычки и типовые слова
    for char in '"\'«»""„':
        name = name.replace(char, '')
    # Убрать типовые окончания
    for word in ['ресторан', 'кафе', 'бар', 'паб', 'пиццерия', 'кофейня',
                 'столовая', 'бистро', 'гриль', 'lounge']:
        name = name.replace(word, '')
    return name.strip()


def _name_similarity(name1: str, name2: str) -> float:
    """Сходство названий (0..1)."""
    n1 = _normalize_name(name1)
    n2 = _normalize_name(name2)
    if not n1 or not n2:
        return 0.0
    # Используем token_sort_ratio для устойчивости к порядку слов
    return fuzz.token_sort_ratio(n1, n2) / 100.0


def _distance_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Расстояние в метрах."""
    return haversine((lat1, lng1), (lat2, lng2), unit=Unit.METERS)


def find_duplicates(conn: sqlite3.Connection) -> list[tuple[int, int, float, float]]:
    """
    Находит пары дубликатов.
    Возвращает: [(keep_id, duplicate_id, name_sim, distance_m), ...]

    Приоритет при слиянии: legacy > osm (legacy имеет больше данных).
    """
    print("[Dedup] Загрузка ресторанов...")
    rows = conn.execute(
        """SELECT id, name, lat, lng, source, city
           FROM restaurants
           WHERE is_duplicate = 0 AND lat IS NOT NULL AND lng IS NOT NULL
           ORDER BY source, id"""
    ).fetchall()

    # Группировка по городам для ускорения
    by_city = defaultdict(list)
    for row in rows:
        city = row['city'] or 'unknown'
        by_city[city].append(row)

    print(f"  {len(rows)} ресторанов в {len(by_city)} городах")

    # Приоритет источников (меньше = лучше)
    source_priority = {'legacy': 0, 'merged': 1, 'osm': 2, '2gis': 3, 'google': 4}
    duplicates = []

    # Размер ячейки geohash (~200м = 0.002 градуса)
    CELL_SIZE = 0.002

    for city, city_restaurants in tqdm(by_city.items(), desc="[Dedup] Города"):
        n = len(city_restaurants)
        if n < 2:
            continue

        # Строим пространственный индекс (grid-based) для O(n) вместо O(n^2)
        grid = defaultdict(list)
        for r in city_restaurants:
            cell_lat = int(r['lat'] / CELL_SIZE)
            cell_lng = int(r['lng'] / CELL_SIZE)
            grid[(cell_lat, cell_lng)].append(r)

        seen_pairs = set()
        for (clat, clng), cell_items in grid.items():
            # Проверяем текущую ячейку и 8 соседей
            neighbors = []
            for dlat in (-1, 0, 1):
                for dlng in (-1, 0, 1):
                    key = (clat + dlat, clng + dlng)
                    if key in grid:
                        neighbors.extend(grid[key])

            for r1 in cell_items:
                for r2 in neighbors:
                    if r1['id'] >= r2['id']:
                        continue
                    pair_key = (r1['id'], r2['id'])
                    if pair_key in seen_pairs:
                        continue
                    seen_pairs.add(pair_key)

                    dist = _distance_meters(r1['lat'], r1['lng'], r2['lat'], r2['lng'])
                    if dist > DEDUP_DISTANCE_METERS:
                        continue

                    sim = _name_similarity(r1['name'], r2['name'])
                    if sim < DEDUP_NAME_THRESHOLD:
                        continue

                    p1 = source_priority.get(r1['source'], 99)
                    p2 = source_priority.get(r2['source'], 99)

                    if p1 <= p2:
                        keep_id, dup_id = r1['id'], r2['id']
                    else:
                        keep_id, dup_id = r2['id'], r1['id']

                    duplicates.append((keep_id, dup_id, sim, dist))

    print(f"  -> Найдено {len(duplicates)} дубликатов")
    return duplicates


def merge_duplicates(conn: sqlite3.Connection,
                     duplicates: list[tuple[int, int, float, float]]):
    """
    Сливает дубликаты: обогащает keep-запись данными из duplicate,
    помечает duplicate как is_duplicate=1.
    """
    print("[Dedup] Мержинг дубликатов...")
    merged = 0

    for keep_id, dup_id, sim, dist in tqdm(duplicates, desc="  Мержинг"):
        keep = conn.execute(
            "SELECT * FROM restaurants WHERE id = ?", (keep_id,)
        ).fetchone()
        dup = conn.execute(
            "SELECT * FROM restaurants WHERE id = ?", (dup_id,)
        ).fetchone()

        if not keep or not dup:
            continue

        # Обогащаем keep данными из dup (заполняем пустые поля)
        updates = {}
        fill_fields = [
            'address', 'phone', 'email', 'website', 'description',
            'average_bill', 'price_range', 'opening_hours',
            'instagram', 'vk', 'facebook', 'youtube', 'external_2gis_id',
            'metro_station',
        ]
        for field in fill_fields:
            keep_val = keep[field] if field in keep.keys() else None
            dup_val = dup[field] if field in dup.keys() else None
            if not keep_val and dup_val:
                updates[field] = dup_val

        # Мержим координаты (предпочитаем legacy/OSM)
        if not keep['lat'] and dup['lat']:
            updates['lat'] = dup['lat']
            updates['lng'] = dup['lng']

        # Мержим рейтинг (берём лучший)
        if (dup['rating'] or 0) > (keep['rating'] or 0):
            updates['rating'] = dup['rating']

        # Мержим source_ids
        keep_sources = json.loads(keep['source_ids']) if keep['source_ids'] else {}
        dup_sources = json.loads(dup['source_ids']) if dup['source_ids'] else {}
        keep_sources[dup['source']] = dup['source_id']
        keep_sources.update(dup_sources)
        updates['source_ids'] = json.dumps(keep_sources, ensure_ascii=False)

        # Применяем обновления
        if updates:
            set_clause = ', '.join(f"{k} = ?" for k in updates)
            values = list(updates.values()) + [keep_id]
            conn.execute(
                f"UPDATE restaurants SET {set_clause} WHERE id = ?",
                values
            )

        # Помечаем дубликат
        conn.execute(
            "UPDATE restaurants SET is_duplicate = 1, merged_into_id = ? WHERE id = ?",
            (keep_id, dup_id)
        )

        # Переносим фото, блюда, отзывы с дубликата на keep
        for table in ['photos', 'dishes', 'reviews']:
            conn.execute(
                f"UPDATE {table} SET restaurant_id = ? WHERE restaurant_id = ?",
                (keep_id, dup_id)
            )

        # Переносим связи с кухнями
        conn.execute(
            """INSERT OR IGNORE INTO restaurant_cuisines (restaurant_id, cuisine_id)
               SELECT ?, cuisine_id FROM restaurant_cuisines WHERE restaurant_id = ?""",
            (keep_id, dup_id)
        )

        merged += 1

    conn.commit()
    print(f"  -> Смержено {merged} дубликатов")
    return merged


def run_deduplication():
    """Запуск дедупликации."""
    print(f"\n{'='*60}")
    print("ДЕДУПЛИКАЦИЯ")
    print(f"{'='*60}\n")

    conn = get_connection()
    log_import('dedup', 'deduplication', 'started')

    duplicates = find_duplicates(conn)
    if duplicates:
        merged = merge_duplicates(conn, duplicates)
        log_import('dedup', 'deduplication', 'completed', merged)
    else:
        print("  Дубликатов не найдено!")
        log_import('dedup', 'deduplication', 'completed', 0)

    # Статистика после дедупликации
    total = conn.execute(
        "SELECT COUNT(*) FROM restaurants WHERE is_duplicate = 0"
    ).fetchone()[0]
    dups = conn.execute(
        "SELECT COUNT(*) FROM restaurants WHERE is_duplicate = 1"
    ).fetchone()[0]
    print(f"\n  Уникальных ресторанов: {total:,}")
    print(f"  Дубликатов: {dups:,}")

    conn.close()


if __name__ == '__main__':
    run_deduplication()
