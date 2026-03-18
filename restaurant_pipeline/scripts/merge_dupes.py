"""
Дедупликация ресторанов: объединение лучших характеристик.

Находит дубликаты (одно имя + адрес + город), объединяет данные
в одну запись, остальные помечает is_duplicate=1.

НЕ трогает филиалы и сети (разные адреса).
"""
import sqlite3
import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'processed', 'pipeline.db')


def get_duplicate_groups(conn):
    """Найти группы дубликатов: одинаковые имя + адрес + город."""
    # Межисточниковые
    groups = conn.execute(
        "SELECT LOWER(TRIM(name)), LOWER(TRIM(address)), LOWER(TRIM(city))"
        " FROM restaurants"
        " WHERE is_duplicate=0 AND name IS NOT NULL"
        "   AND address IS NOT NULL AND address!=''"
        "   AND city IS NOT NULL"
        " GROUP BY LOWER(TRIM(name)), LOWER(TRIM(address)), LOWER(TRIM(city))"
        " HAVING COUNT(*) > 1"
    ).fetchall()
    return groups


def score_record(r):
    """Оценить качество записи — чем больше, тем лучше."""
    s = 0
    if r['description']:
        s += min(len(r['description']), 500)
    if r['lat'] is not None:
        s += 50
    if r['phone']:
        s += 30
    if r['rating'] and r['rating'] > 0:
        s += 40
    if r['review_count'] and r['review_count'] > 0:
        s += 20
    if r['opening_hours']:
        s += 30
    if r['metro_station']:
        s += 20
    if r['average_bill']:
        s += 20
    if r['website'] and 'afisha.ru' not in r['website'] and 'restoclub.ru' not in r['website']:
        s += 30
    features = r['features'] or '[]'
    try:
        s += len(json.loads(features)) * 5
    except Exception:
        pass
    cuisine = r['cuisine'] or '[]'
    try:
        s += len(json.loads(cuisine)) * 5
    except Exception:
        pass
    # Prefer legacy > restoclub > afisha > osm as base
    source_priority = {'legacy': 10, 'restoclub': 8, 'afisha': 6, 'osm': 4}
    s += source_priority.get(r['source'], 0)
    return s


def merge_json_arrays(values):
    """Объединить JSON-массивы без дубликатов."""
    result = []
    seen = set()
    for v in values:
        if not v:
            continue
        try:
            items = json.loads(v)
            if isinstance(items, list):
                for item in items:
                    item_lower = str(item).lower().strip()
                    if item_lower not in seen:
                        seen.add(item_lower)
                        result.append(item)
        except Exception:
            pass
    return json.dumps(result, ensure_ascii=False)


def best_value(*values):
    """Вернуть первое непустое значение."""
    for v in values:
        if v is not None and v != '' and v != '[]':
            return v
    return None


def longest_str(*values):
    """Вернуть самую длинную строку."""
    best = None
    for v in values:
        if v and (best is None or len(str(v)) > len(str(best))):
            best = v
    return best


def max_val(*values):
    """Вернуть максимальное числовое значение."""
    nums = [v for v in values if v is not None and v > 0]
    return max(nums) if nums else None


def merge_source_ids(records):
    """Объединить source_ids из всех записей."""
    merged = {}
    for r in records:
        merged[r['source']] = r['source_id'] or str(r['id'])
        if r['source_ids']:
            try:
                existing = json.loads(r['source_ids'])
                merged.update(existing)
            except Exception:
                pass
    return json.dumps(merged, ensure_ascii=False)


def run():
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.row_factory = sqlite3.Row

    groups = get_duplicate_groups(conn)
    print(f'Найдено {len(groups)} групп дубликатов\n')

    total_merged = 0
    total_removed = 0
    photos_moved = 0
    cuisines_moved = 0
    hours_moved = 0

    for name_lower, addr_lower, city_lower in groups:
        # Получаем все записи группы
        records = conn.execute(
            "SELECT * FROM restaurants"
            " WHERE is_duplicate=0"
            "   AND LOWER(TRIM(name))=? AND LOWER(TRIM(address))=? AND LOWER(TRIM(city))=?",
            (name_lower, addr_lower, city_lower)
        ).fetchall()

        if len(records) < 2:
            continue

        # Выбираем лучшую запись как primary
        scored = [(score_record(r), r) for r in records]
        scored.sort(key=lambda x: x[0], reverse=True)
        primary = scored[0][1]
        duplicates = [s[1] for s in scored[1:]]

        primary_id = primary['id']
        dupe_ids = [d['id'] for d in duplicates]

        # Собираем лучшие значения из всех записей
        all_recs = [primary] + duplicates
        best_name = primary['name']  # Keep original case from primary

        updates = {
            'description': longest_str(*[r['description'] for r in all_recs]),
            'phone': best_value(*[r['phone'] for r in all_recs]),
            'website': best_value(
                *[r['website'] for r in all_recs
                  if r['website'] and 'afisha.ru' not in r['website'] and 'restoclub.ru' not in r['website']],
                *[r['website'] for r in all_recs]
            ),
            'lat': best_value(*[r['lat'] for r in all_recs]),
            'lng': best_value(*[r['lng'] for r in all_recs]),
            'metro_station': best_value(*[r['metro_station'] for r in all_recs]),
            'rating': max_val(*[r['rating'] for r in all_recs]),
            'review_count': max_val(*[r['review_count'] for r in all_recs]),
            'average_bill': best_value(*[r['average_bill'] for r in all_recs]),
            'price_range': best_value(*[r['price_range'] for r in all_recs]),
            'opening_hours': longest_str(*[r['opening_hours'] for r in all_recs]),
            'email': best_value(*[r['email'] for r in all_recs]),
            'instagram': best_value(*[r['instagram'] for r in all_recs]),
            'vk': best_value(*[r['vk'] for r in all_recs]),
            'facebook': best_value(*[r['facebook'] for r in all_recs]),
            'youtube': best_value(*[r['youtube'] for r in all_recs]),
            'features': merge_json_arrays([r['features'] for r in all_recs]),
            'cuisine': merge_json_arrays([r['cuisine'] for r in all_recs]),
            'tags': merge_json_arrays([r['tags'] for r in all_recs]),
            'source_ids': merge_source_ids(all_recs),
            'source': 'merged',
        }

        # Обновляем primary
        set_clause = ', '.join(f'{k}=?' for k in updates)
        values = list(updates.values()) + [primary_id]
        for _retry in range(5):
            try:
                conn.execute(
                    f"UPDATE restaurants SET {set_clause}, updated_at=datetime('now') WHERE id=?",
                    values
                )
                break
            except sqlite3.OperationalError:
                import time
                time.sleep(2)

        # Перемещаем фото, кухни, расписания на primary
        for dupe_id in dupe_ids:
            # Photos
            moved = conn.execute(
                "UPDATE photos SET restaurant_id=? WHERE restaurant_id=?"
                " AND url NOT IN (SELECT url FROM photos WHERE restaurant_id=?)",
                (primary_id, dupe_id, primary_id)
            ).rowcount
            photos_moved += moved
            # Delete remaining photo dupes
            conn.execute("DELETE FROM photos WHERE restaurant_id=?", (dupe_id,))

            # Cuisines
            moved = conn.execute(
                "INSERT OR IGNORE INTO restaurant_cuisines (restaurant_id, cuisine_id)"
                " SELECT ?, cuisine_id FROM restaurant_cuisines WHERE restaurant_id=?",
                (primary_id, dupe_id)
            ).rowcount
            cuisines_moved += moved
            conn.execute("DELETE FROM restaurant_cuisines WHERE restaurant_id=?", (dupe_id,))

            # Working hours — keep most complete set
            existing_days = set(r[0] for r in conn.execute(
                "SELECT day_of_week FROM working_hours WHERE restaurant_id=?", (primary_id,)
            ))
            dupe_hours = conn.execute(
                "SELECT day_of_week, open_time, close_time, is_closed"
                " FROM working_hours WHERE restaurant_id=?", (dupe_id,)
            ).fetchall()
            for dh in dupe_hours:
                if dh[0] not in existing_days:
                    conn.execute(
                        "INSERT OR IGNORE INTO working_hours"
                        " (restaurant_id, day_of_week, open_time, close_time, is_closed)"
                        " VALUES (?,?,?,?,?)",
                        (primary_id, dh[0], dh[1], dh[2], dh[3])
                    )
                    hours_moved += 1
            conn.execute("DELETE FROM working_hours WHERE restaurant_id=?", (dupe_id,))

            # Mark duplicate
            conn.execute(
                "UPDATE restaurants SET is_duplicate=1, merged_into_id=? WHERE id=?",
                (primary_id, dupe_id)
            )
            total_removed += 1

        total_merged += 1

        if total_merged % 50 == 0:
            for _retry in range(5):
                try:
                    conn.commit()
                    break
                except sqlite3.OperationalError:
                    import time
                    time.sleep(2)
            print(f'  ... обработано {total_merged} групп')

    conn.commit()

    # Final stats
    active = conn.execute('SELECT COUNT(*) FROM restaurants WHERE is_duplicate=0').fetchone()[0]
    total_dupes = conn.execute('SELECT COUNT(*) FROM restaurants WHERE is_duplicate=1').fetchone()[0]

    print(f'\n=== РЕЗУЛЬТАТ ===')
    print(f'  Объединено групп: {total_merged}')
    print(f'  Помечено дубликатов: {total_removed}')
    print(f'  Фото перенесено: {photos_moved}')
    print(f'  Связей с кухнями перенесено: {cuisines_moved}')
    print(f'  Расписаний перенесено: {hours_moved}')
    print(f'  Активных ресторанов: {active:,}')
    print(f'  Всего дубликатов: {total_dupes:,}')

    conn.close()


if __name__ == '__main__':
    run()
