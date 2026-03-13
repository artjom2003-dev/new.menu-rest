"""
Парсер legacy MySQL дампа (mr.sql) -> SQLite pipeline DB.
Извлекает данные напрямую из SQL INSERT statements, без запуска MySQL.
"""
import sys
import os
import re
import json
import sqlite3
from pathlib import Path

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from tqdm import tqdm
from utils.db import get_connection, log_import
from utils.slugify import make_slug, make_unique_slug
from config.settings import LEGACY_SQL_FILE


def _parse_insert_values(line: str) -> list[tuple]:
    """
    Парсит INSERT INTO ... VALUES (...),(...); и возвращает список кортежей.
    Обрабатывает экранированные кавычки и NULL.
    """
    # Найти начало VALUES
    match = re.search(r'VALUES\s*', line, re.IGNORECASE)
    if not match:
        return []

    data = line[match.end():]
    # Убрать завершающий ;
    if data.endswith(';'):
        data = data[:-1]

    results = []
    current_tuple = []
    current_value = []
    in_string = False
    escape_next = False
    paren_depth = 0
    i = 0

    while i < len(data):
        ch = data[i]

        if escape_next:
            current_value.append(ch)
            escape_next = False
            i += 1
            continue

        if ch == '\\':
            escape_next = True
            current_value.append(ch)
            i += 1
            continue

        if ch == "'" and not in_string:
            in_string = True
            i += 1
            continue

        if ch == "'" and in_string:
            # Проверяем '' (escaped quote в MySQL)
            if i + 1 < len(data) and data[i + 1] == "'":
                current_value.append("'")
                i += 2
                continue
            in_string = False
            i += 1
            continue

        if in_string:
            current_value.append(ch)
            i += 1
            continue

        if ch == '(':
            if paren_depth == 0:
                current_tuple = []
                current_value = []
            paren_depth += 1
            if paren_depth > 1:
                current_value.append(ch)
            i += 1
            continue

        if ch == ')':
            paren_depth -= 1
            if paren_depth == 0:
                # Завершить текущее значение
                val = ''.join(current_value).strip()
                current_tuple.append(_parse_value(val))
                results.append(tuple(current_tuple))
                current_value = []
            elif paren_depth > 0:
                current_value.append(ch)
            i += 1
            continue

        if ch == ',' and paren_depth == 1:
            val = ''.join(current_value).strip()
            current_tuple.append(_parse_value(val))
            current_value = []
            i += 1
            continue

        if paren_depth >= 1:
            current_value.append(ch)

        i += 1

    return results


def _parse_value(val: str):
    """Преобразует строковое значение из SQL в Python тип."""
    if val == '' or val.upper() == 'NULL':
        return None
    # Убрать обёртку в кавычки (если осталась)
    if val.startswith("'") and val.endswith("'"):
        val = val[1:-1]
    # Обработать escape-последовательности MySQL
    val = val.replace("\\'", "'")
    val = val.replace('\\"', '"')
    val = val.replace('\\n', '\n')
    val = val.replace('\\r', '\r')
    val = val.replace('\\t', '\t')
    val = val.replace('\\\\', '\\')
    return val


def _find_table_inserts(sql_file: Path, table_name: str) -> list[str]:
    """Находит строки INSERT для указанной таблицы."""
    pattern = f"INSERT INTO `{table_name}` VALUES"
    lines = []
    with open(sql_file, 'r', encoding='utf-8', errors='replace') as f:
        for line in f:
            if pattern in line:
                lines.append(line)
    return lines


def import_cities(conn: sqlite3.Connection, sql_file: Path) -> dict[int, int]:
    """Импорт rest_city -> cities. Возвращает маппинг legacy_id -> new_id."""
    print("[Legacy] Импорт городов...")
    lines = _find_table_inserts(sql_file, "rest_city")
    mapping = {}
    existing_slugs = set()
    count = 0

    for line in lines:
        rows = _parse_insert_values(line)
        for row in rows:
            # rest_city: id, name, area, country_id
            if len(row) < 2:
                continue
            legacy_id = int(row[0])
            name = row[1] or f"city-{legacy_id}"
            slug = make_unique_slug(name, existing_slugs)

            try:
                cur = conn.execute(
                    """INSERT OR IGNORE INTO cities (name, slug, country, legacy_id)
                       VALUES (?, ?, 'Россия', ?)""",
                    (name, slug, legacy_id)
                )
                if cur.lastrowid:
                    mapping[legacy_id] = cur.lastrowid
                else:
                    row_data = conn.execute(
                        "SELECT id FROM cities WHERE legacy_id = ?", (legacy_id,)
                    ).fetchone()
                    if row_data:
                        mapping[legacy_id] = row_data[0]
                count += 1
            except Exception as e:
                print(f"  [!] Город {legacy_id} ({name}): {e}")

    conn.commit()
    print(f"  -> {count} городов импортировано")
    return mapping


def import_cuisines(conn: sqlite3.Connection, sql_file: Path) -> dict[int, int]:
    """Импорт rest_answer_items_kitchen -> cuisines."""
    print("[Legacy] Импорт кухонь...")
    lines = _find_table_inserts(sql_file, "rest_answer_items_kitchen")
    mapping = {}
    existing_slugs = set()
    count = 0

    for line in lines:
        rows = _parse_insert_values(line)
        for row in rows:
            # id, value, 2gis_tag
            if len(row) < 2:
                continue
            legacy_id = int(row[0])
            name = row[1] or f"cuisine-{legacy_id}"
            slug = make_unique_slug(name, existing_slugs)

            try:
                cur = conn.execute(
                    """INSERT OR IGNORE INTO cuisines (name, slug, legacy_id)
                       VALUES (?, ?, ?)""",
                    (name, slug, legacy_id)
                )
                if cur.lastrowid:
                    mapping[legacy_id] = cur.lastrowid
                else:
                    row_data = conn.execute(
                        "SELECT id FROM cuisines WHERE legacy_id = ?", (legacy_id,)
                    ).fetchone()
                    if row_data:
                        mapping[legacy_id] = row_data[0]
                count += 1
            except Exception as e:
                print(f"  [!] Кухня {legacy_id}: {e}")

    conn.commit()
    print(f"  -> {count} кухонь импортировано")
    return mapping


def import_restaurants(conn: sqlite3.Connection, sql_file: Path,
                       city_mapping: dict[int, int]) -> dict[int, int]:
    """
    Импорт rest_rest -> restaurants.
    Возвращает маппинг legacy_id -> new_id.
    """
    print("[Legacy] Импорт ресторанов...")
    lines = _find_table_inserts(sql_file, "rest_rest")
    mapping = {}
    existing_slugs = set()
    count = 0
    skipped = 0
    errors = 0

    # rest_rest columns (по порядку из CREATE TABLE):
    # 0: id, 1: name, 2: name_ext, 3: city, 4: address, 5: closestMetro,
    # 6: openingHours, 7: openingDate, 8: phone, 9: cellular,
    # 10: email, 11: www, 12: description_ru, 13-18: description_en..ar,
    # 19: entertainment, 20: comments, 21: fieldOfActivity,
    # 22: tableCount, 23: parkingPlaceCount, 24: paymentOptions,
    # 25: avgBill, 26: hasWifi, 27: passwordWifi, 28: forChildren,
    # 29: ratingQuality, 30: ratingService, 31: ratingInterior,
    # 32: facebook, 33: instagram, 34: twitter, 35: vk,
    # 36: favourite, 37: 2gis_id, 38: 2gis_organization_id, 39: 2gis_last_update,
    # 40: 2gis_last_update (wrong in original comment), 41: lat, 42: lon,
    # 42-55: work_time_mon_begin..work_time_sun_end (14 полей),
    # 56: work_time,
    # 57-63: break_mon..break_sun (7 полей),
    # 64: slogan, 65: menuPdf,
    # 66: sum_ratingInterior, 67: sum_ratingService, 68: sum_ratingQuality,
    # 69: votedInterior, 70: votedService, 71: votedQuality,
    # 72: base_language, 73: description, 74: video, 75: visit_count,
    # 76: youtube, 77: odnoklassniki,
    # 78: restoran_ru, 79: restoclub_ru, 80: afisha_ru, 81: gis_ru,
    # 82: ping, 83: speed_dowload, 84: speed_upload,
    # 85: delivery, 86: parent_id, 87: main

    for line in lines:
        rows = _parse_insert_values(line)
        for row in tqdm(rows, desc="  Рестораны", leave=False):
            try:
                if len(row) < 42:
                    skipped += 1
                    continue

                legacy_id = int(row[0])
                name = row[1]
                if not name or name.strip() == '':
                    skipped += 1
                    continue

                name = name.strip()

                # Пропускаем "головные" записи сетей (main=1 с parent_id)
                main_flag = _safe_int(row[87]) if len(row) > 87 else 0
                parent_id = _safe_int(row[86]) if len(row) > 86 else None

                city_legacy_id = _safe_int(row[3])
                city_name = None
                city_id = None
                if city_legacy_id and city_legacy_id in city_mapping:
                    city_id = city_mapping[city_legacy_id]
                    # Получить имя города
                    city_row = conn.execute(
                        "SELECT name FROM cities WHERE id = ?", (city_id,)
                    ).fetchone()
                    if city_row:
                        city_name = city_row[0]

                address = row[4]
                metro = row[5]
                phone = row[8]
                email = row[10]
                website = row[11]
                description = row[12]  # description_ru
                avg_bill = _safe_int(row[25])
                has_wifi = 1 if row[26] and row[26] not in ('', '0', 'no') else 0
                has_delivery = 1 if _safe_int(row[85] if len(row) > 85 else 0) == 1 else 0

                lat = _safe_float(row[41])
                lng = _safe_float(row[42])

                facebook = row[32] if len(row) > 32 else None
                instagram = row[33] if len(row) > 33 else None
                vk = row[35] if len(row) > 35 else None
                youtube = row[76] if len(row) > 76 else None
                gis_id = row[37] if len(row) > 37 else None
                slogan = row[64] if len(row) > 64 else None

                rating_q = _safe_int(row[29]) if len(row) > 29 else 0
                rating_s = _safe_int(row[30]) if len(row) > 30 else 0
                rating_i = _safe_int(row[31]) if len(row) > 31 else 0
                rating = 0
                rating_parts = [r for r in [rating_q, rating_s, rating_i] if r and r > 0]
                if rating_parts:
                    rating = sum(rating_parts) / len(rating_parts)

                slug = make_unique_slug(name, existing_slugs)

                # Собираем opening_hours из work_time полей
                opening_hours = _extract_working_hours(row)

                # Определяем price_range
                price_range = None
                if avg_bill:
                    if avg_bill <= 500:
                        price_range = '₽'
                    elif avg_bill <= 1500:
                        price_range = '₽₽'
                    elif avg_bill <= 3000:
                        price_range = '₽₽₽'
                    else:
                        price_range = '₽₽₽₽'

                cur = conn.execute(
                    """INSERT INTO restaurants (
                        name, slug, city, city_id, address, metro_station,
                        lat, lng, phone, email, website, description,
                        average_bill, price_range, rating,
                        opening_hours, has_wifi, has_delivery,
                        instagram, vk, facebook, youtube,
                        external_2gis_id, legacy_id,
                        source, source_id, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'legacy', ?, 'active')""",
                    (name, slug, city_name, city_id, address, metro,
                     lat, lng, phone, email, website, description,
                     avg_bill, price_range, rating,
                     opening_hours, has_wifi, has_delivery,
                     instagram, vk, facebook, youtube,
                     gis_id, legacy_id, str(legacy_id))
                )
                mapping[legacy_id] = cur.lastrowid
                count += 1

            except Exception as e:
                errors += 1
                if errors <= 10:
                    print(f"  [!] Ресторан row[0]={row[0] if row else '?'}: {e}")

    conn.commit()
    print(f"  -> {count} ресторанов, пропущено {skipped}, ошибок {errors}")
    return mapping


def import_restaurant_cuisines(conn: sqlite3.Connection, sql_file: Path,
                                rest_mapping: dict[int, int],
                                cuisine_mapping: dict[int, int]):
    """Импорт rest_rest2kitchen -> restaurant_cuisines."""
    print("[Legacy] Импорт связей ресторан-кухня...")
    lines = _find_table_inserts(sql_file, "rest_rest2kitchen")
    count = 0
    seen = set()

    for line in lines:
        rows = _parse_insert_values(line)
        for row in rows:
            # id, restId, kitchenId
            if len(row) < 3:
                continue
            rest_legacy = _safe_int(row[1])
            cuisine_legacy = _safe_int(row[2])
            if not rest_legacy or not cuisine_legacy:
                continue

            rest_id = rest_mapping.get(rest_legacy)
            cuisine_id = cuisine_mapping.get(cuisine_legacy)
            if not rest_id or not cuisine_id:
                continue

            pair = (rest_id, cuisine_id)
            if pair in seen:
                continue
            seen.add(pair)

            try:
                conn.execute(
                    """INSERT OR IGNORE INTO restaurant_cuisines (restaurant_id, cuisine_id)
                       VALUES (?, ?)""",
                    (rest_id, cuisine_id)
                )
                count += 1
            except Exception:
                pass

    conn.commit()
    print(f"  -> {count} связей ресторан-кухня")


def import_photos(conn: sqlite3.Connection, sql_file: Path,
                  rest_mapping: dict[int, int]):
    """Импорт rest_rest_photo + rest_rest_photo_2gis -> photos."""
    print("[Legacy] Импорт фотографий...")
    count = 0

    # 1. rest_rest_photo: id, rest_id, filename, ordering, nofile
    lines = _find_table_inserts(sql_file, "rest_rest_photo")
    for line in lines:
        rows = _parse_insert_values(line)
        for row in rows:
            if len(row) < 5:
                continue
            rest_legacy = _safe_int(row[1])
            filename = row[2]
            ordering = _safe_int(row[3]) or 0
            nofile = _safe_int(row[4])

            if nofile == 1 or not filename:
                continue

            rest_id = rest_mapping.get(rest_legacy)
            if not rest_id:
                continue

            url = f"/legacy-photos/{filename}"
            try:
                conn.execute(
                    """INSERT INTO photos (restaurant_id, url, type, source, is_primary, legacy_id)
                       VALUES (?, ?, 'interior', 'legacy', ?, ?)""",
                    (rest_id, url, 1 if ordering == 0 else 0, _safe_int(row[0]))
                )
                count += 1
            except Exception:
                pass

    # 2. rest_rest_photo_2gis: id, rest_id, url, description, ...
    lines = _find_table_inserts(sql_file, "rest_rest_photo_2gis")
    for line in lines:
        rows = _parse_insert_values(line)
        for row in rows:
            if len(row) < 3:
                continue
            rest_legacy = _safe_int(row[1])
            url = row[2]
            if not url:
                continue

            rest_id = rest_mapping.get(rest_legacy)
            if not rest_id:
                continue

            caption = row[3] if len(row) > 3 else None
            try:
                conn.execute(
                    """INSERT INTO photos (restaurant_id, url, caption, type, source)
                       VALUES (?, ?, ?, 'interior', '2gis')""",
                    (rest_id, url, caption)
                )
                count += 1
            except Exception:
                pass

    conn.commit()
    print(f"  -> {count} фотографий")


def import_menu(conn: sqlite3.Connection, sql_file: Path,
                rest_mapping: dict[int, int]):
    """Импорт rest_menu -> dishes."""
    print("[Legacy] Импорт меню/блюд...")

    # Сначала категории: rest_menu_section
    # id, rest_id, value_ru, ..., ordering, status
    section_names = {}
    lines = _find_table_inserts(sql_file, "rest_menu_section")
    for line in lines:
        rows = _parse_insert_values(line)
        for row in rows:
            if len(row) >= 3:
                section_names[_safe_int(row[0])] = row[2]  # value_ru

    count = 0
    errors = 0
    # rest_menu columns (from CREATE TABLE):
    # 0: id, 1: rest_id, 2: title_ru, 3: markers, 4: composition,
    # 5: recipe(LONGTEXT, HTML with base64 images), 6: price, 7: weight,
    # 8: discount, 9: volume, 10: calories, 11: proteins, 12: carbohydrates,
    # 13: fats, 14: image(LONGBLOB, always NULL in dump), 15: video_url,
    # 16: section_id, 17: rating, 18: description_ru, ...27: slogan,
    # 28: status, 29: currency_id, 30: volume_unit_id, 31: weight_unit_id,
    # 32: requested, 33-39: title_en..ar, 40: cookingoptions
    # NOTE: AUTO_INCREMENT=18440 but only ~3176 actual records (rest were deleted)
    lines = _find_table_inserts(sql_file, "rest_menu")
    for line in lines:
        rows = _parse_insert_values(line)
        for row in rows:
            if len(row) < 7:
                continue
            try:
                legacy_id = _safe_int(row[0])
                rest_legacy = _safe_int(row[1])
                title = row[2]  # title_ru

                if not title or not title.strip():
                    continue

                rest_id = rest_mapping.get(rest_legacy)
                if not rest_id:
                    continue

                section_id = _safe_int(row[16]) if len(row) > 16 else None
                category = section_names.get(section_id) if section_id else None

                price = _safe_float(row[6])
                weight = row[7] if len(row) > 7 else None
                calories = _safe_int(row[10]) if len(row) > 10 else None
                protein = _safe_float(row[11]) if len(row) > 11 else None
                carbs = _safe_float(row[12]) if len(row) > 12 else None
                fat = _safe_float(row[13]) if len(row) > 13 else None
                description = row[18] if len(row) > 18 else None
                composition = row[4] if len(row) > 4 else None

                conn.execute(
                    """INSERT INTO dishes (restaurant_id, category, name, description,
                       composition, price, weight, calories, protein, fat, carbs,
                       source, legacy_id)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'legacy', ?)""",
                    (rest_id, category, title.strip(), description,
                     composition, price, weight, calories, protein, fat, carbs,
                     legacy_id)
                )
                count += 1
            except Exception as e:
                errors += 1
                if errors <= 5:
                    print(f"  [!] Блюдо row[0]={row[0] if row else '?'}: {e}")

    conn.commit()
    print(f"  -> {count} блюд, ошибок {errors}")

    # Фото блюд: rest_menu_photo
    # Columns: id, menuId, filename, ordering, nofile
    print("[Legacy] Импорт фотографий блюд...")
    dish_legacy_map = {}
    for row in conn.execute("SELECT id, legacy_id FROM dishes WHERE legacy_id IS NOT NULL"):
        dish_legacy_map[row[1]] = row[0]

    photo_count = 0
    lines = _find_table_inserts(sql_file, "rest_menu_photo")
    for line in lines:
        rows = _parse_insert_values(line)
        for row in rows:
            if len(row) < 3:
                continue
            menu_legacy_id = _safe_int(row[1])
            filename = row[2]
            nofile = _safe_int(row[4]) if len(row) > 4 else None

            if nofile == 1 or not filename:
                continue

            dish_id = dish_legacy_map.get(menu_legacy_id)
            if not dish_id:
                continue

            photo_url = f"/legacy-menu-photos/{filename}"
            try:
                conn.execute(
                    "UPDATE dishes SET photo_url = ? WHERE id = ? AND photo_url IS NULL",
                    (photo_url, dish_id)
                )
                photo_count += 1
            except Exception:
                pass

    conn.commit()
    print(f"  -> {photo_count} фото блюд привязано")


def import_reviews(conn: sqlite3.Connection, sql_file: Path,
                   rest_mapping: dict[int, int]):
    """Импорт rest_review -> reviews."""
    print("[Legacy] Импорт отзывов...")
    lines = _find_table_inserts(sql_file, "rest_review")
    count = 0

    for line in lines:
        rows = _parse_insert_values(line)
        for row in rows:
            if len(row) < 10:
                continue
            # rest_review columns:
            # 0:id, 1:restId, 2:userId, 3:text, 4:rate,
            # 5:date, 6:status, 7:firstname, 8:lastname,
            # 9:ratingInterior, 10:ratingQuality, 11:ratingService
            legacy_id = _safe_int(row[0])
            rest_legacy = _safe_int(row[1])
            text = row[3]
            rate = _safe_float(row[4])
            date = row[5]
            firstname = row[7] if len(row) > 7 else None
            lastname = row[8] if len(row) > 8 else None
            author = ' '.join(filter(None, [firstname, lastname])) or None

            rest_id = rest_mapping.get(rest_legacy)
            if not rest_id:
                continue

            try:
                conn.execute(
                    """INSERT OR IGNORE INTO reviews
                       (restaurant_id, author, rating, text, date, source, legacy_id)
                       VALUES (?, ?, ?, ?, ?, 'legacy', ?)""",
                    (rest_id, author, rate, text, date, legacy_id)
                )
                count += 1
            except Exception:
                pass

    conn.commit()
    print(f"  -> {count} отзывов")


def _extract_working_hours(row: tuple) -> str | None:
    """Извлечь расписание из полей work_time_*."""
    days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
    hours = []
    for i, day in enumerate(days):
        begin_idx = 42 + i * 2
        end_idx = 43 + i * 2
        if len(row) > end_idx:
            begin = row[begin_idx]
            end = row[end_idx]
            if begin and end and begin.strip() and end.strip():
                hours.append(f"{day}: {begin.strip()}-{end.strip()}")
    return '; '.join(hours) if hours else None


def _safe_int(val) -> int | None:
    if val is None:
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        return None


def _safe_float(val) -> float | None:
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def run_legacy_import():
    """Запуск полного импорта legacy данных."""
    sql_file = LEGACY_SQL_FILE
    if not sql_file.exists():
        print(f"[!] Файл не найден: {sql_file}")
        return

    print(f"\n{'='*60}")
    print(f"LEGACY IMPORT: {sql_file}")
    print(f"Размер: {sql_file.stat().st_size / 1024 / 1024:.1f} MB")
    print(f"{'='*60}\n")

    conn = get_connection()
    log_import('legacy', 'full_import', 'started')

    try:
        # 1. Города
        city_mapping = import_cities(conn, sql_file)

        # 2. Кухни
        cuisine_mapping = import_cuisines(conn, sql_file)

        # 3. Рестораны
        rest_mapping = import_restaurants(conn, sql_file, city_mapping)

        # 4. Связи ресторан-кухня
        import_restaurant_cuisines(conn, sql_file, rest_mapping, cuisine_mapping)

        # 5. Фотографии
        import_photos(conn, sql_file, rest_mapping)

        # 6. Меню/Блюда
        import_menu(conn, sql_file, rest_mapping)

        # 7. Отзывы
        import_reviews(conn, sql_file, rest_mapping)

        # Статистика
        stats = {}
        for table in ['cities', 'cuisines', 'restaurants', 'restaurant_cuisines',
                       'photos', 'dishes', 'reviews']:
            row = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()
            stats[table] = row[0]

        print(f"\n{'='*60}")
        print("ИТОГО LEGACY IMPORT:")
        for table, cnt in stats.items():
            print(f"  {table:25s} {cnt:>8,}")
        print(f"{'='*60}")

        total = sum(stats.values())
        log_import('legacy', 'full_import', 'completed', total)

    except Exception as e:
        log_import('legacy', 'full_import', 'error', error_message=str(e))
        raise
    finally:
        conn.close()


if __name__ == '__main__':
    from utils.db import init_db
    init_db()
    run_legacy_import()
