"""
Скачка фотографий ресторанов с Яндекс Карт.

Работает ТОЛЬКО по ресторанам, у которых:
  1. Нет фото в pipeline.db (source != 'yandex')
  2. Есть координаты
  3. yandex_matched = 1 (уже был найден при проверке часов) ИЛИ ещё не проверялся

Использует тот же метод что yandex_hours.py — парсинг HTML-страницы Яндекс Карт.

Запуск:
  cd restaurant_pipeline
  python -m enrichment.yandex_photos
  python -m enrichment.yandex_photos --city Москва
  python -m enrichment.yandex_photos --limit 100
  python -m enrichment.yandex_photos --only-matched   # только уже сматченные (быстрее)
"""
import sys
import os
import json
import time
import random
import argparse
import sqlite3
from datetime import datetime
from pathlib import Path

os.environ['PYTHONUNBUFFERED'] = '1'
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import requests
from rapidfuzz import fuzz

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from config.settings import USER_AGENT, PIPELINE_DB, PROCESSED_DIR

# ─── Settings ────────────────────────────────────────────────────────────────
REQUEST_DELAY_MIN = 2.0
REQUEST_DELAY_MAX = 4.0
BLOCK_DELAY = 120
NAME_SIMILARITY_THRESHOLD = 0.55
COMMIT_BATCH = 50
PHOTO_SIZE = "1000x600"  # размер фото для URL
MAX_PHOTOS_PER_RESTAURANT = 10

USER_AGENTS = [
    USER_AGENT,
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/132.0.0.0 Safari/537.36",
]


def _get_connection() -> sqlite3.Connection:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(PIPELINE_DB), timeout=300)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA busy_timeout=300000")
    conn.row_factory = sqlite3.Row
    return conn


def _create_session() -> requests.Session:
    s = requests.Session()
    s.headers.update({
        "User-Agent": random.choice(USER_AGENTS),
        "Accept-Language": "ru,en;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    })
    try:
        s.get("https://yandex.ru/maps/", timeout=15)
        print(f"[Yandex] Session created, cookies: {len(s.cookies)}")
    except Exception as e:
        print(f"[Yandex] Session init error: {e}")
    return s


def _search_yandex(session, name, address, lat, lng):
    query = f"{name} {address}" if address else name
    try:
        resp = session.get("https://yandex.ru/maps/", params={
            "text": query, "ll": f"{lng},{lat}", "z": "17", "mode": "search",
        }, timeout=20)

        if resp.status_code == 429: return [{"_error": "rate_limit"}]
        if resp.status_code == 403: return [{"_error": "forbidden"}]
        if resp.status_code >= 400: return [{"_error": f"http_{resp.status_code}"}]

        html = resp.text
        if "SmartCaptcha" in html and '{"config":{"requestId"' not in html:
            return [{"_error": "captcha"}]

        marker = '{"config":{"requestId"'
        pos = html.find(marker)
        if pos < 0: return []

        end_tag = html.find('</script>', pos)
        if end_tag < 0: return []

        data = json.loads(html[pos:end_tag].rstrip().rstrip(';'))
        stack = data.get("stack", [])
        if not stack: return []

        items = stack[0].get("results", {}).get("items", [])
        return [i for i in items if i.get("type") == "business"]

    except requests.exceptions.Timeout:
        return [{"_error": "timeout"}]
    except Exception as e:
        return [{"_error": str(e)}]


def _normalize_name(name):
    name = name.lower().strip()
    for ch in '"\'«»""„()[]':
        name = name.replace(ch, '')
    for word in ['ресторан', 'кафе', 'бар', 'паб', 'столовая', 'кофейня',
                 'пиццерия', 'бистро', 'гастробар', 'гастропаб', 'траттория',
                 'кондитерская', 'пекарня', 'буфет', 'чайхана', 'шашлычная']:
        name = name.replace(word, '')
    return name.strip()


def _is_match(our_name, yandex_name):
    n1 = _normalize_name(our_name)
    n2 = _normalize_name(yandex_name)
    if not n1 or not n2: return False
    if n1 == n2: return True
    if n1 in n2 or n2 in n1: return True
    if fuzz.token_sort_ratio(n1, n2) / 100.0 >= NAME_SIMILARITY_THRESHOLD: return True
    if fuzz.partial_ratio(n1, n2) / 100.0 >= 0.75: return True
    return False


def _extract_photos(item) -> list[str]:
    """Extract photo URLs from Yandex business item."""
    photos_data = item.get("photos")
    if not photos_data or not isinstance(photos_data, dict):
        return []

    photo_items = photos_data.get("items", [])
    urls = []
    for p in photo_items[:MAX_PHOTOS_PER_RESTAURANT]:
        tpl = p.get("urlTemplate", "")
        if tpl and "avatars.mds.yandex.net" in tpl:
            url = tpl.replace("%s", PHOTO_SIZE)
            urls.append(url)
    return urls


def _ensure_columns(conn):
    cols = [row[1] for row in conn.execute("PRAGMA table_info(restaurants)").fetchall()]
    if "yandex_photos_at" not in cols:
        conn.execute("ALTER TABLE restaurants ADD COLUMN yandex_photos_at TEXT")
        conn.commit()
        print("  [DB] Added column: yandex_photos_at")


def _db_retry(conn, sql, params=(), max_retries=30):
    for attempt in range(max_retries):
        try:
            conn.execute(sql, params)
            return
        except sqlite3.OperationalError as e:
            if "locked" in str(e) and attempt < max_retries - 1:
                time.sleep(min(5, 1 + attempt * 0.5))
            else:
                raise


def _db_commit_retry(conn, max_retries=30):
    for attempt in range(max_retries):
        try:
            conn.commit()
            return
        except sqlite3.OperationalError as e:
            if "locked" in str(e) and attempt < max_retries - 1:
                time.sleep(min(5, 1 + attempt * 0.5))
            else:
                raise


def run_yandex_photos(city=None, limit=0, only_matched=False):
    print("\n" + "=" * 60)
    print("  ЯНДЕКС КАРТЫ: скачка фотографий ресторанов")
    print("=" * 60)

    conn = _get_connection()
    _ensure_columns(conn)

    where = [
        "r.is_duplicate = 0",
        "r.lat IS NOT NULL",
        "r.lng IS NOT NULL",
        "r.yandex_photos_at IS NULL",
        "NOT EXISTS (SELECT 1 FROM photos p WHERE p.restaurant_id = r.id)",
    ]
    params = []

    if only_matched:
        where.append("r.yandex_matched = 1")

    if city:
        where.append("r.city = ?")
        params.append(city)

    query = f"""
        SELECT r.id, r.name, r.city, r.address, r.lat, r.lng,
               r.yandex_matched, r.yandex_name
        FROM restaurants r
        WHERE {' AND '.join(where)}
        ORDER BY
            CASE WHEN r.city = 'Москва' THEN 0
                 WHEN r.city = 'Санкт-Петербург' THEN 1
                 ELSE 2 END,
            r.id
    """
    if limit > 0:
        query += f" LIMIT {limit}"

    rows_no_photos = conn.execute(query, params).fetchall()
    total = len(rows_no_photos)

    if total == 0:
        print("[Yandex Photos] Все рестораны без фото уже проверены.")
        conn.close()
        return

    print(f"[Yandex Photos] К проверке: {total:,} ресторанов без фото")
    if city:
        print(f"                Город: {city}")

    stats = {"checked": 0, "matched": 0, "photos_saved": 0, "not_found": 0, "errors": 0, "no_photos": 0}

    session = _create_session()
    consecutive_errors = 0
    start_time = time.time()

    for idx, row in enumerate(rows_no_photos):
        rest_id = row['id']
        rest_name = row['name']
        rest_addr = row['address'] or ''

        if (idx + 1) % 100 == 0 or idx == 0:
            elapsed = time.time() - start_time
            rate = (idx + 1) / elapsed if elapsed > 0 else 0
            eta_h = ((total - idx - 1) / rate / 3600) if rate > 0 else 0
            print(f"\n[Photos] {idx + 1:,}/{total:,} "
                  f"({(idx + 1) / total * 100:.1f}%) | "
                  f"Фото: {stats['photos_saved']} | "
                  f"Найдено: {stats['matched']} | "
                  f"Ошибки: {stats['errors']} | "
                  f"ETA: {eta_h:.1f}ч", flush=True)

        # Если уже был сматчен при проверке часов — используем yandex_name для поиска
        if row['yandex_matched'] and row['yandex_name']:
            # Уже знаем что ресторан найден, ищем снова для фото
            pass

        results = _search_yandex(session, rest_name, rest_addr, row['lat'], row['lng'])

        # Handle errors
        if results and isinstance(results[0], dict) and "_error" in results[0]:
            error = results[0]["_error"]
            stats["errors"] += 1
            consecutive_errors += 1

            if error in ("rate_limit", "forbidden", "captcha"):
                print(f"  [{error}] Waiting {BLOCK_DELAY}s, recreating session...")
                time.sleep(BLOCK_DELAY)
                session = _create_session()
                if consecutive_errors >= 15:
                    print(f"\n[!] 15 consecutive errors, stopping.")
                    break
                continue

            _db_retry(conn, "UPDATE restaurants SET yandex_photos_at = ? WHERE id = ?",
                      (datetime.now().isoformat(), rest_id))
            if consecutive_errors >= 15:
                break
            time.sleep(random.uniform(REQUEST_DELAY_MIN, REQUEST_DELAY_MAX))
            continue

        consecutive_errors = 0
        stats["checked"] += 1
        now = datetime.now().isoformat()

        # Find match
        matched_item = None
        for item in results:
            if _is_match(rest_name, item.get("title", "")):
                matched_item = item
                break

        if matched_item is None:
            stats["not_found"] += 1
            _db_retry(conn, "UPDATE restaurants SET yandex_photos_at = ? WHERE id = ?", (now, rest_id))
        else:
            stats["matched"] += 1
            photo_urls = _extract_photos(matched_item)

            if not photo_urls:
                stats["no_photos"] += 1
            else:
                for i, url in enumerate(photo_urls):
                    _db_retry(conn,
                        "INSERT OR IGNORE INTO photos (restaurant_id, url, source, is_primary) "
                        "VALUES (?, ?, 'yandex', ?)",
                        (rest_id, url, 1 if i == 0 else 0))
                stats["photos_saved"] += len(photo_urls)

            _db_retry(conn, "UPDATE restaurants SET yandex_photos_at = ? WHERE id = ?", (now, rest_id))

        if (idx + 1) % COMMIT_BATCH == 0:
            _db_commit_retry(conn)

        time.sleep(random.uniform(REQUEST_DELAY_MIN, REQUEST_DELAY_MAX))

    _db_commit_retry(conn)

    elapsed = time.time() - start_time
    print("\n" + "=" * 60)
    print("  РЕЗУЛЬТАТЫ: ФОТО С ЯНДЕКС КАРТ")
    print("=" * 60)
    print(f"  Проверено:       {stats['checked']:,}")
    print(f"  Найдено:         {stats['matched']:,}")
    print(f"  Фото сохранено:  {stats['photos_saved']:,}")
    print(f"  Без фото на Я:   {stats['no_photos']:,}")
    print(f"  Не найдено:      {stats['not_found']:,}")
    print(f"  Ошибки:          {stats['errors']:,}")
    print(f"  Время:           {elapsed / 3600:.1f} часов")

    # Итого
    total_yandex = conn.execute("SELECT COUNT(*) FROM photos WHERE source = 'yandex'").fetchone()[0]
    rest_yandex = conn.execute("SELECT COUNT(DISTINCT restaurant_id) FROM photos WHERE source = 'yandex'").fetchone()[0]
    print(f"\n  Всего yandex-фото: {total_yandex:,}")
    print(f"  Ресторанов:        {rest_yandex:,}")

    conn.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Яндекс Карты: скачка фотографий")
    parser.add_argument('--city', type=str, help='Фильтр по городу')
    parser.add_argument('--limit', type=int, default=0, help='Лимит ресторанов')
    parser.add_argument('--only-matched', action='store_true',
                        help='Только уже сматченные при проверке часов')
    args = parser.parse_args()
    run_yandex_photos(city=args.city, limit=args.limit, only_matched=args.only_matched)
