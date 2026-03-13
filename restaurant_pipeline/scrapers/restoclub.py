"""
Скрейпер restoclub.ru

Парсит рестораны из sitemap → JSON-LD на страницах.
~17,000 ресторанов (Москва, СПб, регионы).

Запуск:
  cd restaurant_pipeline
  python -m scrapers.restoclub
  python -m scrapers.restoclub --city msk
  python -m scrapers.restoclub --limit 100
  python -m scrapers.restoclub --resume
"""
import argparse
import gzip
import json
import re
import time
import random
import sqlite3
from io import BytesIO
from pathlib import Path
from html import unescape

import requests
from tqdm import tqdm

from utils.db import get_connection, log_import
from utils.slugify import make_slug
from config.settings import REQUEST_DELAY_MIN, REQUEST_DELAY_MAX, USER_AGENT

# ─── Константы ──────────────────────────────────────────────────────────────

SITEMAP_INDEX = "https://www.restoclub.ru/sitemap/sitemap_index.xml"
SITEMAP_PLACES_PATTERN = re.compile(r"sitemap_places_\d+-\d+\.xml\.gz")

BASE_URL = "https://www.restoclub.ru"

# Маппинг город restoclub → наше название
CITY_MAP = {
    "msk": "Москва",
    "spb": "Санкт-Петербург",
    "ekb": "Екатеринбург",
    "nsk": "Новосибирск",
    "kzn": "Казань",
    "nn": "Нижний Новгород",
    "samara": "Самара",
    "sochi": "Сочи",
    "krd": "Краснодар",
    "rnd": "Ростов-на-Дону",
    "vld": "Владивосток",
    "kry": "Красноярск",
    "klng": "Калининград",
}

USER_AGENTS = [
    USER_AGENT,
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
]

CACHE_DIR = Path(__file__).resolve().parent.parent / "data" / "raw" / "restoclub"


# ─── HTTP ────────────────────────────────────────────────────────────────────

def _get_session() -> requests.Session:
    s = requests.Session()
    s.headers.update({
        "User-Agent": random.choice(USER_AGENTS),
        "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.5",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    })
    return s


def _fetch(session: requests.Session, url: str, max_retries: int = 3,
           binary: bool = False) -> str | bytes | None:
    """GET с retry, rate-limit и обработкой 429."""
    for attempt in range(1, max_retries + 1):
        try:
            if attempt > 1:
                session.headers["User-Agent"] = random.choice(USER_AGENTS)

            resp = session.get(url, timeout=30)

            if resp.status_code == 404:
                return None
            if resp.status_code == 429:
                wait = int(resp.headers.get("Retry-After", 30))
                print(f"  [429] Too Many Requests, ждём {wait}с...")
                time.sleep(wait)
                continue
            if resp.status_code >= 500:
                time.sleep(5 * attempt)
                continue

            resp.raise_for_status()
            time.sleep(random.uniform(REQUEST_DELAY_MIN, REQUEST_DELAY_MAX))

            return resp.content if binary else resp.text

        except requests.exceptions.HTTPError as e:
            if e.response is not None and e.response.status_code in (403, 401):
                return None
            if attempt < max_retries:
                time.sleep(5 * attempt)
                continue
            return None

        except (requests.exceptions.ConnectionError,
                requests.exceptions.Timeout) as e:
            print(f"  [HTTP] Attempt {attempt}/{max_retries} failed: {e}")
            time.sleep(5 * attempt)
            continue

    return None


# ─── Sitemap ─────────────────────────────────────────────────────────────────

def fetch_sitemap_urls(session: requests.Session,
                       city_filter: str | None = None) -> list[dict]:
    """
    Скачиваем sitemap index → sitemap_places_*.xml.gz → список URL ресторанов.
    Возвращает [{"url": "...", "city": "msk", "slug": "..."}]
    """
    print("[sitemap] Загрузка sitemap index...")
    index_xml = _fetch(session, SITEMAP_INDEX)
    if not index_xml:
        raise RuntimeError("Не удалось загрузить sitemap index")

    # Ищем sitemap_places_*.xml.gz
    sitemap_locs = re.findall(r"<loc>(.*?)</loc>", index_xml)
    place_sitemaps = [u for u in sitemap_locs if SITEMAP_PLACES_PATTERN.search(u)]
    print(f"[sitemap] Найдено {len(place_sitemaps)} файлов с ресторанами")

    all_places = []
    for sm_url in place_sitemaps:
        print(f"[sitemap] Загрузка {sm_url.split('/')[-1]}...")
        data = _fetch(session, sm_url, binary=True)
        if not data:
            print(f"  [WARN] Не удалось загрузить {sm_url}")
            continue

        try:
            xml = gzip.decompress(data).decode("utf-8")
        except Exception as e:
            print(f"  [WARN] Ошибка распаковки: {e}")
            continue

        urls = re.findall(r"<loc>(.*?)</loc>", xml)
        for u in urls:
            # Только страницы ресторанов, без /opinions
            if "/place/" not in u or u.endswith("/opinions"):
                continue
            path = u.replace(BASE_URL + "/", "")
            parts = path.split("/")
            if len(parts) >= 3:
                city = parts[0]
                slug = parts[2]

                if city_filter and city != city_filter:
                    continue

                all_places.append({
                    "url": u,
                    "city": city,
                    "slug": slug,
                })

    print(f"[sitemap] Итого URL ресторанов: {len(all_places)}")
    return all_places


# ─── Парсинг страницы ресторана ──────────────────────────────────────────────

def parse_restaurant_page(html: str, url: str, city_code: str, slug: str) -> dict | None:
    """Извлечь данные из HTML страницы ресторана (JSON-LD + мета-теги)."""

    # 1. JSON-LD
    ld_blocks = re.findall(
        r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html, re.DOTALL
    )

    restaurant_data = None
    for block in ld_blocks:
        try:
            obj = json.loads(block)
            if isinstance(obj, dict) and obj.get("@type") == "Restaurant":
                restaurant_data = obj
                break
            if isinstance(obj, list):
                for item in obj:
                    if isinstance(item, dict) and item.get("@type") == "Restaurant":
                        restaurant_data = item
                        break
        except json.JSONDecodeError:
            continue

    if not restaurant_data:
        return None

    # 2. Извлекаем поля
    name = restaurant_data.get("name", "").strip()
    if not name:
        return None

    address_obj = restaurant_data.get("address", {})
    address = address_obj.get("streetAddress", "")
    locality = address_obj.get("addressLocality", "")

    geo = restaurant_data.get("geo", {})
    lat = _safe_float(geo.get("latitude"))
    lng = _safe_float(geo.get("longitude"))

    phone = restaurant_data.get("telephone", "")
    cuisines = restaurant_data.get("servesCuisine", [])
    if isinstance(cuisines, str):
        cuisines = [cuisines]

    price_range = restaurant_data.get("priceRange", "")
    avg_bill = _parse_price(price_range)

    rating_obj = restaurant_data.get("aggregateRating", {})
    rating = _safe_float(rating_obj.get("ratingValue"))
    review_count = int(rating_obj.get("reviewCount", 0) or 0)

    hours = restaurant_data.get("openingHours", [])
    if isinstance(hours, str):
        hours = [hours]

    # 3. Дополнительные данные из HTML
    description = _extract_meta(html, "og:description") or _extract_meta(html, "description")
    image = restaurant_data.get("image") or _extract_meta(html, "og:image")

    # Фото из страницы (подсчёт)
    photo_urls = _extract_photos(html)

    # Метро
    metro = _extract_metro(html)

    # Фичи (features)
    features = _extract_features(html)

    # Город
    city_name = CITY_MAP.get(city_code, locality or city_code)

    result = {
        "name": unescape(name),
        "slug": slug,
        "city": city_name,
        "city_code": city_code,
        "address": unescape(address) if address else None,
        "lat": lat,
        "lng": lng,
        "phone": phone or None,
        "website": url,
        "description": unescape(description) if description else None,
        "cuisines": cuisines,
        "price_range": price_range or None,
        "average_bill": avg_bill,
        "rating": rating,
        "review_count": review_count,
        "opening_hours": hours,
        "metro_station": metro,
        "features": features,
        "cover_image": image,
        "photo_urls": photo_urls,
        "source": "restoclub",
        "source_id": f"restoclub:{city_code}/{slug}",
    }

    return result


def _safe_float(val) -> float | None:
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def _parse_price(price_str: str) -> int | None:
    """Извлечь средний чек из строки '2400 рублей' или '1500 ₽'."""
    if not price_str:
        return None
    m = re.search(r"(\d[\d\s]*)", price_str.replace("\xa0", ""))
    if m:
        return int(m.group(1).replace(" ", ""))
    return None


def _extract_meta(html: str, name: str) -> str | None:
    """Извлечь content из meta-тега."""
    # og:* → property, иначе name
    if name.startswith("og:"):
        m = re.search(
            rf'<meta\s+(?:property|name)="{re.escape(name)}"\s+content="([^"]*)"',
            html, re.IGNORECASE
        )
    else:
        m = re.search(
            rf'<meta\s+name="{re.escape(name)}"\s+content="([^"]*)"',
            html, re.IGNORECASE
        )
    if not m:
        # Reverse attribute order
        if name.startswith("og:"):
            m = re.search(
                rf'<meta\s+content="([^"]*)"\s+(?:property|name)="{re.escape(name)}"',
                html, re.IGNORECASE
            )
        else:
            m = re.search(
                rf'<meta\s+content="([^"]*)"\s+name="{re.escape(name)}"',
                html, re.IGNORECASE
            )
    return unescape(m.group(1)) if m else None


def _extract_photos(html: str) -> list[str]:
    """Извлечь URL фотографий из страницы."""
    photos = []
    # img.restoclub.ru images
    for m in re.finditer(r'(https?://img\.restoclub\.ru/uploads/place/[^"\'>\s]+)', html):
        url = m.group(1)
        # Пропускаем мелкие превью
        if "_thumb" not in url and "_icon" not in url and url not in photos:
            photos.append(url)
    return photos


def _extract_metro(html: str) -> str | None:
    """Извлечь название ближайшей станции метро."""
    # Обычно в формате "м. Смоленская" или class="metro"
    m = re.search(r'(?:м\.\s*|метро\s+)([А-Яа-яЁё\s-]+)', html)
    if m:
        return m.group(1).strip()
    return None


def _extract_features(html: str) -> list[str]:
    """Извлечь особенности ресторана."""
    features = []
    feature_keywords = {
        "wi-fi": "wifi", "вай-фай": "wifi", "wifi": "wifi",
        "парковка": "parking", "терраса": "terrace", "веранда": "terrace",
        "доставка": "delivery", "завтраки": "breakfast",
        "бизнес-ланч": "business_lunch", "бизнес ланч": "business_lunch",
        "живая музыка": "live_music", "караоке": "karaoke",
        "детская комната": "kids_room", "детское меню": "kids_menu",
        "банкетный зал": "banquet_hall", "кальян": "hookah",
        "бар": "bar", "винная карта": "wine_list",
        "панорамный вид": "panoramic_view", "у воды": "waterfront",
        "круглосуточно": "24h",
    }
    html_lower = html.lower()
    for keyword, feature in feature_keywords.items():
        if keyword in html_lower and feature not in features:
            features.append(feature)
    return features


# ─── Сохранение в pipeline.db ─────────────────────────────────────────────────

def save_to_db(conn: sqlite3.Connection, data: dict) -> bool:
    """Сохранить ресторан в pipeline.db. Возвращает True если записан."""
    cursor = conn.cursor()

    # Resolve city_id
    city_id = None
    if data["city"]:
        row = cursor.execute(
            "SELECT id FROM cities WHERE name = ? LIMIT 1", (data["city"],)
        ).fetchone()
        if row:
            city_id = row[0]
        else:
            # Создаём город
            from utils.slugify import make_slug as _slugify
            city_slug = _slugify(data["city"])
            try:
                cursor.execute(
                    "INSERT INTO cities (name, slug, country) VALUES (?, ?, 'Россия')",
                    (data["city"], city_slug)
                )
                city_id = cursor.lastrowid
            except sqlite3.IntegrityError:
                row = cursor.execute(
                    "SELECT id FROM cities WHERE slug = ?", (city_slug,)
                ).fetchone()
                city_id = row[0] if row else None

    # Slug — используем restoclub slug напрямую (уникален в рамках города)
    slug = f"rc-{data.get('city_code', '')}-{data['slug']}" if data.get("city_code") else f"rc-{data['slug']}"

    # Features → JSON
    features_json = json.dumps(data["features"], ensure_ascii=False) if data["features"] else "[]"

    # Cuisines → JSON
    cuisines_json = json.dumps(data["cuisines"], ensure_ascii=False) if data["cuisines"] else "[]"

    # Opening hours → text
    hours_text = "; ".join(data["opening_hours"]) if data["opening_hours"] else None

    try:
        cursor.execute("""
            INSERT INTO restaurants (
                name, slug, city, city_id, address, metro_station,
                lat, lng, phone, website, description,
                cuisine, price_range, average_bill,
                rating, review_count, opening_hours,
                features, status, source, source_id
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(source, source_id) DO UPDATE SET
                description = COALESCE(EXCLUDED.description, restaurants.description),
                rating = EXCLUDED.rating,
                review_count = EXCLUDED.review_count,
                phone = COALESCE(EXCLUDED.phone, restaurants.phone),
                updated_at = datetime('now')
        """, (
            data["name"], slug, data["city"], city_id,
            data["address"], data["metro_station"],
            data["lat"], data["lng"],
            data["phone"], data["website"], data["description"],
            cuisines_json, data["price_range"], data["average_bill"],
            data["rating"], data["review_count"], hours_text,
            features_json, "active",
            data["source"], data["source_id"],
        ))
        rest_id = cursor.lastrowid or cursor.execute(
            "SELECT id FROM restaurants WHERE source = ? AND source_id = ?",
            (data["source"], data["source_id"])
        ).fetchone()[0]
    except sqlite3.IntegrityError:
        # Slug conflict — retry with suffix
        slug = f"{slug}-rc"
        try:
            cursor.execute("""
                INSERT INTO restaurants (
                    name, slug, city, city_id, address, metro_station,
                    lat, lng, phone, website, description,
                    cuisine, price_range, average_bill,
                    rating, review_count, opening_hours,
                    features, status, source, source_id
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                data["name"], slug, data["city"], city_id,
                data["address"], data["metro_station"],
                data["lat"], data["lng"],
                data["phone"], data["website"], data["description"],
                cuisines_json, data["price_range"], data["average_bill"],
                data["rating"], data["review_count"], hours_text,
                features_json, "active",
                data["source"], data["source_id"],
            ))
            rest_id = cursor.lastrowid
        except Exception:
            return False

    # Фото
    if data["photo_urls"]:
        for i, photo_url in enumerate(data["photo_urls"][:20]):  # Макс 20 фото
            try:
                cursor.execute("""
                    INSERT OR IGNORE INTO photos (restaurant_id, url, type, source, is_primary)
                    VALUES (?, ?, 'interior', 'restoclub', ?)
                """, (rest_id, photo_url, 1 if i == 0 else 0))
            except Exception:
                pass

    # Кухни → restaurant_cuisines
    for cuisine_name in data["cuisines"]:
        cuisine_name = cuisine_name.strip()
        if not cuisine_name:
            continue
        from utils.slugify import make_slug as _slugify
        c_slug = _slugify(cuisine_name)
        # Upsert cuisine
        try:
            cursor.execute(
                "INSERT OR IGNORE INTO cuisines (name, slug) VALUES (?, ?)",
                (cuisine_name, c_slug)
            )
        except Exception:
            pass
        c_row = cursor.execute(
            "SELECT id FROM cuisines WHERE slug = ?", (c_slug,)
        ).fetchone()
        if c_row:
            try:
                cursor.execute(
                    "INSERT OR IGNORE INTO restaurant_cuisines (restaurant_id, cuisine_id) VALUES (?, ?)",
                    (rest_id, c_row[0])
                )
            except Exception:
                pass

    # Working hours parse
    _save_working_hours(cursor, rest_id, data["opening_hours"])

    return True


def _save_working_hours(cursor: sqlite3.Cursor, rest_id: int, hours: list[str]):
    """Парсинг openingHours формата Schema.org → working_hours таблица."""
    if not hours:
        return

    day_map = {"Mo": 0, "Tu": 1, "We": 2, "Th": 3, "Fr": 4, "Sa": 5, "Su": 6}

    for entry in hours:
        # Format: "Mo-Su 12:00-00:00" or "Mo,Tu,We 10:00-22:00"
        m = re.match(r"([A-Za-z,\-]+)\s+(\d{2}:\d{2})-(\d{2}:\d{2})", entry)
        if not m:
            continue

        days_str, open_time, close_time = m.group(1), m.group(2), m.group(3)

        # Раскрываем дни
        day_nums = []
        for part in days_str.split(","):
            if "-" in part:
                start, end = part.split("-")
                s = day_map.get(start.strip())
                e = day_map.get(end.strip())
                if s is not None and e is not None:
                    if s <= e:
                        day_nums.extend(range(s, e + 1))
                    else:
                        day_nums.extend(range(s, 7))
                        day_nums.extend(range(0, e + 1))
            else:
                d = day_map.get(part.strip())
                if d is not None:
                    day_nums.append(d)

        for day in day_nums:
            try:
                cursor.execute("""
                    INSERT OR REPLACE INTO working_hours
                    (restaurant_id, day_of_week, open_time, close_time, is_closed)
                    VALUES (?, ?, ?, ?, 0)
                """, (rest_id, day, open_time, close_time))
            except Exception:
                pass


# ─── Кеширование HTML ────────────────────────────────────────────────────────

def _cache_path(city: str, slug: str) -> Path:
    return CACHE_DIR / city / f"{slug}.html"


def _load_cached(city: str, slug: str) -> str | None:
    p = _cache_path(city, slug)
    if p.exists():
        return p.read_text(encoding="utf-8", errors="replace")
    return None


def _save_cache(city: str, slug: str, html: str):
    p = _cache_path(city, slug)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(html, encoding="utf-8")


# ─── Добавим индекс для ON CONFLICT ──────────────────────────────────────────

def _ensure_index(conn: sqlite3.Connection):
    """Создаём уникальный индекс source+source_id если его нет."""
    conn.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurants_source_source_id
        ON restaurants(source, source_id)
    """)
    conn.commit()


# ─── Основной процесс ────────────────────────────────────────────────────────

def get_scraped_ids(conn: sqlite3.Connection) -> set[str]:
    """Получить уже спарсенные source_id для resume."""
    rows = conn.execute(
        "SELECT source_id FROM restaurants WHERE source = 'restoclub'"
    ).fetchall()
    return {r[0] for r in rows}


def run(city_filter: str | None = None, limit: int | None = None,
        resume: bool = False, no_cache: bool = False):
    """Основная функция парсинга."""
    session = _get_session()
    conn = get_connection()
    _ensure_index(conn)

    # 1. Получаем URL из sitemap
    places = fetch_sitemap_urls(session, city_filter)
    if not places:
        print("[!] Не найдено ресторанов в sitemap")
        return

    # 2. Resume: пропускаем уже спарсенные
    already_scraped = set()
    if resume:
        already_scraped = get_scraped_ids(conn)
        before = len(places)
        places = [p for p in places
                  if f"restoclub:{p['city']}/{p['slug']}" not in already_scraped]
        print(f"[resume] Пропускаем {before - len(places)} уже спарсенных, осталось {len(places)}")

    if limit:
        places = places[:limit]

    print(f"\n[scrape] Начинаем парсинг {len(places)} ресторанов...")
    try:
        log_import("restoclub", "scrape", "started", len(places))
    except Exception:
        pass

    saved = 0
    errors = 0
    skipped = 0

    pbar = tqdm(places, desc="Restoclub", unit="rest")
    for place in pbar:
        url = place["url"]
        city = place["city"]
        slug = place["slug"]
        source_id = f"restoclub:{city}/{slug}"

        pbar.set_postfix({"saved": saved, "err": errors, "city": city})

        # Кеш
        html = None
        if not no_cache:
            html = _load_cached(city, slug)

        if not html:
            html = _fetch(session, url)
            if not html:
                errors += 1
                continue
            if not no_cache:
                _save_cache(city, slug, html)

        # Парсим
        data = parse_restaurant_page(html, url, city, slug)
        if not data:
            skipped += 1
            continue

        # Сохраняем (с retry при database locked)
        for _attempt in range(3):
            try:
                if save_to_db(conn, data):
                    saved += 1
                break
            except sqlite3.OperationalError:
                time.sleep(2)

        # Коммит каждые 50
        if saved % 50 == 0:
            try:
                conn.commit()
            except sqlite3.OperationalError:
                time.sleep(2)
                conn.commit()

    try:
        conn.commit()
    except sqlite3.OperationalError:
        time.sleep(3)
        conn.commit()
    conn.close()

    print(f"\n[done] Сохранено: {saved}, ошибок: {errors}, пропущено: {skipped}")
    try:
        log_import("restoclub", "scrape", "completed", saved)
    except Exception:
        pass


# ─── CLI ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Restoclub.ru scraper")
    parser.add_argument("--city", help="Фильтр по городу (msk, spb, ekb, ...)")
    parser.add_argument("--limit", type=int, help="Лимит ресторанов")
    parser.add_argument("--resume", action="store_true", help="Продолжить с места остановки")
    parser.add_argument("--no-cache", action="store_true", help="Не использовать кеш HTML")
    args = parser.parse_args()

    run(
        city_filter=args.city,
        limit=args.limit,
        resume=args.resume,
        no_cache=args.no_cache,
    )


if __name__ == "__main__":
    main()
