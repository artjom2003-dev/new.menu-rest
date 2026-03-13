"""
Скрейпер afisha.ru/restaurants

Парсит рестораны из sitemap → JSON-LD на страницах.
467 городов, десятки тысяч ресторанов.

Запуск:
  cd restaurant_pipeline
  python -m scrapers.afisha
  python -m scrapers.afisha --city msk
  python -m scrapers.afisha --limit 100
  python -m scrapers.afisha --resume
  python -m scrapers.afisha --top-cities    # только крупные города
"""
import argparse
import json
import re
import time
import random
import sqlite3
from html import unescape
from pathlib import Path
from xml.etree import ElementTree as ET

import requests
from tqdm import tqdm

from utils.db import get_connection, log_import
from utils.slugify import make_slug
from config.settings import REQUEST_DELAY_MIN, REQUEST_DELAY_MAX, USER_AGENT

# ─── Константы ──────────────────────────────────────────────────────────────

BASE_URL = "https://www.afisha.ru"
RESTS_SITEMAP = f"{BASE_URL}/rests/sitemap.xml"
NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}

# Маппинг slug → город (для приоритетных городов)
CITY_MAP = {
    "msk": "Москва",
    "spb": "Санкт-Петербург",
    "ekaterinburg": "Екатеринбург",
    "novosibirsk": "Новосибирск",
    "kazan": "Казань",
    "nnovgorod": "Нижний Новгород",
    "samara": "Самара",
    "sochi": "Сочи",
    "krasnodar": "Краснодар",
    "rostov-na-donu": "Ростов-на-Дону",
    "vladivostok": "Владивосток",
    "krasnoyarsk": "Красноярск",
    "kaliningrad": "Калининград",
    "voronezh": "Воронеж",
    "prm": "Пермь",
    "ufa": "Уфа",
    "chelyabinsk": "Челябинск",
    "omsk": "Омск",
    "tyumen": "Тюмень",
    "irkutsk": "Иркутск",
}

TOP_CITIES = [
    "msk", "spb", "ekaterinburg", "novosibirsk", "kazan",
    "nnovgorod", "samara", "sochi", "krasnodar", "rostov-na-donu",
    "vladivostok", "krasnoyarsk", "kaliningrad", "voronezh", "prm",
    "ufa", "chelyabinsk",
]

USER_AGENTS = [
    USER_AGENT,
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
]

CACHE_DIR = Path(__file__).resolve().parent.parent / "data" / "raw" / "afisha"


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
                return None  # blocked/auth — skip
            if attempt < max_retries:
                time.sleep(5 * attempt)
                continue
            return None

        except (requests.exceptions.ConnectionError,
                requests.exceptions.Timeout) as e:
            print(f"  [HTTP] Attempt {attempt}/{max_retries}: {e}")
            time.sleep(5 * attempt)
            continue

    return None


# ─── Sitemap ─────────────────────────────────────────────────────────────────

def fetch_city_sitemaps(session: requests.Session,
                        city_filter: str | None = None,
                        top_only: bool = False) -> list[dict]:
    """
    Загрузка /rests/sitemap.xml → список городских sitemap.
    Возвращает [{"city": "msk", "sitemap_url": "..."}]
    """
    print("[sitemap] Загрузка /rests/sitemap.xml...")
    xml_text = _fetch(session, RESTS_SITEMAP)
    if not xml_text:
        raise RuntimeError("Не удалось загрузить rests/sitemap.xml")

    root = ET.fromstring(xml_text)
    city_sitemaps = []

    for sitemap in root.findall("sm:sitemap", NS):
        loc = sitemap.findtext("sm:loc", namespaces=NS)
        if not loc:
            continue
        # URL: https://www.afisha.ru/{city}/restaurants/sitemap.xml
        m = re.match(r"https://www\.afisha\.ru/([^/]+)/restaurants/sitemap\.xml", loc)
        if not m:
            continue
        city = m.group(1)

        if city_filter and city != city_filter:
            continue
        if top_only and city not in TOP_CITIES:
            continue

        city_sitemaps.append({"city": city, "sitemap_url": loc})

    print(f"[sitemap] Найдено {len(city_sitemaps)} городов")
    return city_sitemaps


def fetch_restaurant_urls(session: requests.Session,
                          city_sitemap: dict) -> list[dict]:
    """
    Загрузка sitemap города → список URL ресторанов.
    """
    city = city_sitemap["city"]
    index_url = city_sitemap["sitemap_url"]

    # Сначала загружаем index → ищем sitemap-restuarants.xml
    xml_text = _fetch(session, index_url)
    if not xml_text:
        return []

    root = ET.fromstring(xml_text)
    rest_sitemap_url = None

    for sitemap in root.findall("sm:sitemap", NS):
        loc = sitemap.findtext("sm:loc", namespaces=NS)
        if loc and "sitemap-restuarants" in loc:
            rest_sitemap_url = loc
            break

    if not rest_sitemap_url:
        return []

    # Загружаем sitemap с ресторанами
    xml_text = _fetch(session, rest_sitemap_url)
    if not xml_text:
        return []

    root = ET.fromstring(xml_text)
    results = []

    for url_el in root.findall("sm:url", NS):
        loc = url_el.findtext("sm:loc", namespaces=NS)
        if not loc or "/restaurant/" not in loc:
            continue

        # URL: /msk/restaurant/name-123456/
        m = re.match(r"https://www\.afisha\.ru/([^/]+)/restaurant/([^/]+)/", loc)
        if m:
            slug = m.group(2)
            results.append({
                "url": loc,
                "city": city,
                "slug": slug,
            })

    return results


# ─── Парсинг страницы ────────────────────────────────────────────────────────

def parse_restaurant_page(html: str, url: str, city_code: str, slug: str) -> dict | None:
    """Извлечь данные из HTML страницы ресторана."""

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

    # 2. Основные поля из JSON-LD
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
    website_url = restaurant_data.get("url", "")

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
    description = _extract_description(html)
    photos = _extract_photos(html)
    metro = _extract_metro(html)
    features = _extract_features(html)
    menu_pdfs = _extract_menu_pdfs(html)

    # Город
    city_name = CITY_MAP.get(city_code, locality or city_code.replace("-", " ").title())

    return {
        "name": unescape(name),
        "slug": slug,
        "city": city_name,
        "city_code": city_code,
        "address": unescape(address) if address else None,
        "lat": lat,
        "lng": lng,
        "phone": phone or None,
        "website": website_url if website_url and "afisha.ru" not in website_url else None,
        "description": description,
        "cuisines": cuisines,
        "price_range": price_range or None,
        "average_bill": avg_bill,
        "rating": rating,
        "review_count": review_count,
        "opening_hours": hours,
        "metro_station": metro,
        "features": features,
        "photo_urls": photos,
        "menu_pdfs": menu_pdfs,
        "source": "afisha",
        "source_id": f"afisha:{city_code}/{slug}",
        "source_url": url,
    }


def _safe_float(val) -> float | None:
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def _parse_price(price_str: str) -> int | None:
    if not price_str:
        return None
    # "3000–6000 ₽" → берём среднее
    nums = re.findall(r"\d+", price_str.replace("\xa0", "").replace(" ", ""))
    if len(nums) >= 2:
        return (int(nums[0]) + int(nums[1])) // 2
    elif len(nums) == 1:
        return int(nums[0])
    return None


def _extract_description(html: str) -> str | None:
    """Извлечь описание из meta og:description или из текста страницы."""
    # og:description
    m = re.search(
        r'<meta\s+(?:property|name)="og:description"\s+content="([^"]*)"', html, re.IGNORECASE
    )
    if not m:
        m = re.search(
            r'<meta\s+content="([^"]*)"\s+(?:property|name)="og:description"', html, re.IGNORECASE
        )
    if m:
        desc = unescape(m.group(1)).strip()
        if len(desc) > 30:
            return desc
    return None


def _extract_photos(html: str) -> list[str]:
    """Извлечь URL фотографий."""
    photos = []
    # afisha image CDN: img01.rl0.ru/afisha/...
    for m in re.finditer(r'(https?://img\d+\.rl0\.ru/afisha/[^"\'>\s]+\.(?:jpg|jpeg|png|webp))', html, re.IGNORECASE):
        url = m.group(1)
        # Берём только достаточно большие изображения
        if any(dim in url for dim in ["1894x", "1064x", "600x", "800x", "e1500x"]):
            if url not in photos:
                photos.append(url)

    # s2.afisha.ru/mediastorage images (direct)
    for m in re.finditer(r'(https?://s\d+\.afisha\.ru/mediastorage/[^"\'>\s]+\.(?:jpg|jpeg|png|webp))', html, re.IGNORECASE):
        url = m.group(1)
        if url not in photos:
            photos.append(url)

    return photos[:30]  # макс 30 фото


def _extract_metro(html: str) -> str | None:
    """Извлечь название метро."""
    # afisha обычно показывает метро в JSON-LD или в тексте
    m = re.search(r'"metro[Ss]tation[Nn]ame"\s*:\s*"([^"]+)"', html)
    if m:
        return m.group(1)
    m = re.search(r'(?:м\.\s*|метро\s+)([А-Яа-яЁё\s-]+?)(?:[,<"\)])', html)
    if m:
        return m.group(1).strip()
    return None


def _extract_features(html: str) -> list[str]:
    """Извлечь особенности ресторана из afisha."""
    features = []
    html_lower = html.lower()

    checks = {
        "завтрак": "breakfast",
        "бизнес-ланч": "business_lunch",
        "бизнес ланч": "business_lunch",
        "доставка": "delivery",
        "парковка": "parking",
        "wi-fi": "wifi", "wifi": "wifi",
        "терраса": "terrace", "веранда": "terrace",
        "банкет": "banquet_hall",
        "кейтеринг": "catering",
        "живая музыка": "live_music",
        "караоке": "karaoke",
        "детское меню": "kids_menu",
        "детская комната": "kids_room",
        "бронирование": "reservations",
        "кальян": "hookah",
        "винная карта": "wine_list",
    }

    for kw, feat in checks.items():
        if kw in html_lower and feat not in features:
            features.append(feat)

    # acceptsReservations в JSON-LD
    if '"acceptsreservations"' in html_lower and '"yes"' in html_lower:
        if "reservations" not in features:
            features.append("reservations")

    return features


def _extract_menu_pdfs(html: str) -> list[str]:
    """Извлечь ссылки на PDF меню."""
    pdfs = []
    for m in re.finditer(r'(https?://www\.afisha\.ru/uploads/menu/[^"\'>\s]+\.pdf)', html):
        if m.group(1) not in pdfs:
            pdfs.append(m.group(1))
    return pdfs


# ─── Сохранение в pipeline.db ─────────────────────────────────────────────────

def save_to_db(conn: sqlite3.Connection, data: dict) -> bool:
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

    # Slug
    slug = f"af-{data['city_code']}-{data['slug']}"

    # JSON fields
    features_json = json.dumps(data["features"], ensure_ascii=False) if data["features"] else "[]"
    cuisines_json = json.dumps(data["cuisines"], ensure_ascii=False) if data["cuisines"] else "[]"
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
            data["phone"], data["website"] or data["source_url"],
            data["description"],
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
        slug = f"{slug}-af"
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
                data["phone"], data["website"] or data["source_url"],
                data["description"],
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
        for i, photo_url in enumerate(data["photo_urls"][:20]):
            try:
                cursor.execute("""
                    INSERT OR IGNORE INTO photos (restaurant_id, url, type, source, is_primary)
                    VALUES (?, ?, 'interior', 'afisha', ?)
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

    # Working hours
    _save_working_hours(cursor, rest_id, data["opening_hours"])

    return True


def _save_working_hours(cursor: sqlite3.Cursor, rest_id: int, hours: list[str]):
    if not hours:
        return

    day_map = {"Mo": 0, "Tu": 1, "We": 2, "Th": 3, "Fr": 4, "Sa": 5, "Su": 6}

    for entry in hours:
        # "Mo-Su: 12:00-00:00" or "Mo-Su 12:00-00:00"
        m = re.match(r"([A-Za-z,\-]+)[:\s]+(\d{2}:\d{2})-(\d{2}:\d{2})", entry)
        if not m:
            continue

        days_str, open_time, close_time = m.group(1), m.group(2), m.group(3)

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


# ─── Кеш ─────────────────────────────────────────────────────────────────────

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


# ─── Индекс ──────────────────────────────────────────────────────────────────

def _ensure_index(conn: sqlite3.Connection):
    conn.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurants_source_source_id
        ON restaurants(source, source_id)
    """)
    conn.commit()


# ─── Основной процесс ────────────────────────────────────────────────────────

def get_scraped_ids(conn: sqlite3.Connection) -> set[str]:
    rows = conn.execute(
        "SELECT source_id FROM restaurants WHERE source = 'afisha'"
    ).fetchall()
    return {r[0] for r in rows}


def run(city_filter: str | None = None, limit: int | None = None,
        resume: bool = False, top_only: bool = False, no_cache: bool = False):
    session = _get_session()
    conn = get_connection()
    _ensure_index(conn)

    # 1. Получаем городские sitemap
    city_sitemaps = fetch_city_sitemaps(session, city_filter, top_only)
    if not city_sitemaps:
        print("[!] Не найдено городов")
        return

    # 2. Собираем URL ресторанов по всем городам
    all_places = []
    for cs in tqdm(city_sitemaps, desc="Загрузка sitemap", unit="city"):
        urls = fetch_restaurant_urls(session, cs)
        all_places.extend(urls)

    print(f"[sitemap] Итого URL ресторанов: {len(all_places)}")

    # 3. Resume
    if resume:
        already = get_scraped_ids(conn)
        before = len(all_places)
        all_places = [p for p in all_places
                      if f"afisha:{p['city']}/{p['slug']}" not in already]
        print(f"[resume] Пропускаем {before - len(all_places)} уже спарсенных, осталось {len(all_places)}")

    if limit:
        all_places = all_places[:limit]

    print(f"\n[scrape] Начинаем парсинг {len(all_places)} ресторанов...")
    try:
        log_import("afisha", "scrape", "started", len(all_places))
    except Exception:
        pass  # DB might be locked by parallel scraper

    saved = 0
    errors = 0
    skipped = 0

    pbar = tqdm(all_places, desc="Afisha", unit="rest")
    for place in pbar:
        url = place["url"]
        city = place["city"]
        slug = place["slug"]

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

        if saved % 50 == 0:
            try:
                conn.commit()
            except sqlite3.OperationalError:
                time.sleep(2)
                conn.commit()

    conn.commit()
    conn.close()

    print(f"\n[done] Сохранено: {saved}, ошибок: {errors}, пропущено: {skipped}")
    log_import("afisha", "scrape", "completed", saved)


# ─── CLI ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Afisha.ru restaurant scraper")
    parser.add_argument("--city", help="Фильтр по городу (msk, spb, ekaterinburg, ...)")
    parser.add_argument("--limit", type=int, help="Лимит ресторанов")
    parser.add_argument("--resume", action="store_true", help="Продолжить с места остановки")
    parser.add_argument("--top-cities", action="store_true", help="Только крупные города (17)")
    parser.add_argument("--no-cache", action="store_true", help="Не использовать кеш HTML")
    args = parser.parse_args()

    run(
        city_filter=args.city,
        limit=args.limit,
        resume=args.resume,
        top_only=args.top_cities,
        no_cache=args.no_cache,
    )


if __name__ == "__main__":
    main()
