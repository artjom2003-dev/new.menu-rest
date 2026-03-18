"""
Скрейпер tripadvisor.ru/restaurants

Парсит рестораны Москвы и Санкт-Петербурга через Playwright (браузерная автоматизация).
TripAdvisor использует Cloudflare, поэтому requests не подходит.

Запуск:
  cd restaurant_pipeline
  python -m scrapers.tripadvisor
  python -m scrapers.tripadvisor --city moscow
  python -m scrapers.tripadvisor --city spb
  python -m scrapers.tripadvisor --limit 6
  python -m scrapers.tripadvisor --resume
"""
import argparse
import asyncio
import json
import random
import re
import sqlite3
import time
from html import unescape
from pathlib import Path

from tqdm import tqdm

from utils.slugify import make_slug

# ─── Константы ──────────────────────────────────────────────────────────────

BASE_URL = "https://www.tripadvisor.ru"

CITIES = {
    "moscow": {
        "name": "Москва",
        "geo_id": "298484",
        "url_name": "Moscow",
    },
    "spb": {
        "name": "Санкт-Петербург",
        "geo_id": "298507",
        "url_name": "Saint_Petersburg",
    },
}

# Задержки длиннее чем для afisha/restoclub из-за защиты TripAdvisor
TA_DELAY_MIN = 3.0
TA_DELAY_MAX = 7.0
TA_PAGE_DELAY_MIN = 5.0
TA_PAGE_DELAY_MAX = 10.0

CACHE_DIR = Path(__file__).resolve().parent.parent / "data" / "raw" / "tripadvisor"

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
]

# Маппинг русских дней → Schema.org
RU_DAY_MAP = {
    "пн": "Mo", "понедельник": "Mo",
    "вт": "Tu", "вторник": "Tu",
    "ср": "We", "среда": "We",
    "чт": "Th", "четверг": "Th",
    "пт": "Fr", "пятница": "Fr",
    "сб": "Sa", "суббота": "Sa",
    "вс": "Su", "воскресенье": "Su",
}

EN_DAY_MAP = {"Mo": 0, "Tu": 1, "We": 2, "Th": 3, "Fr": 4, "Sa": 5, "Su": 6}

# Маппинг фич
FEATURE_KEYWORDS = {
    "wi-fi": "wifi", "wifi": "wifi", "бесплатный wi-fi": "wifi",
    "парковка": "parking",
    "доставка": "delivery",
    "терраса": "terrace", "веранда": "terrace", "на открытом воздухе": "terrace",
    "бронирование": "reservations",
    "живая музыка": "live_music",
    "завтрак": "breakfast",
    "бизнес-ланч": "business_lunch", "бизнес ланч": "business_lunch",
    "банкет": "banquet_hall", "банкетный зал": "banquet_hall",
    "детское меню": "kids_menu",
    "детская комната": "kids_room",
    "кальян": "hookah",
    "караоке": "karaoke",
    "бар": "bar",
    "вегетарианское": "vegan", "веганские блюда": "vegan",
    "безглютеновые": "gluten_free",
    "халяль": "halal",
    "кошерная": "kosher",
    "романтическ": "romantic",
    "с видом": "with_view", "панорамный вид": "with_view",
    "кондиционер": "ac",
    "допускаются животные": "pet_friendly",
}


# ─── Браузер (Playwright) ───────────────────────────────────────────────────

COOKIES_FILE = Path(__file__).resolve().parent.parent / "data" / "tripadvisor_cookies.json"
TA_DB_PATH = Path(__file__).resolve().parent.parent / "data" / "processed" / "tripadvisor.db"

TA_SCHEMA = """
CREATE TABLE IF NOT EXISTS cities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    country TEXT DEFAULT 'Россия'
);

CREATE TABLE IF NOT EXISTS cuisines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS restaurants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    city TEXT,
    city_id INTEGER REFERENCES cities(id),
    address TEXT,
    metro_station TEXT,
    lat REAL,
    lng REAL,
    phone TEXT,
    website TEXT,
    description TEXT,
    cuisine TEXT,
    price_range TEXT,
    average_bill INTEGER,
    rating REAL DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    opening_hours TEXT,
    features TEXT,
    status TEXT DEFAULT 'active',
    source TEXT NOT NULL DEFAULT 'tripadvisor',
    source_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS restaurant_cuisines (
    restaurant_id INTEGER REFERENCES restaurants(id),
    cuisine_id INTEGER REFERENCES cuisines(id),
    PRIMARY KEY (restaurant_id, cuisine_id)
);

CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER REFERENCES restaurants(id),
    url TEXT,
    type TEXT DEFAULT 'interior',
    source TEXT DEFAULT 'tripadvisor',
    is_primary INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS working_hours (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER REFERENCES restaurants(id),
    day_of_week INTEGER,
    open_time TEXT,
    close_time TEXT,
    is_closed INTEGER DEFAULT 0,
    UNIQUE(restaurant_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_restaurants_source_id ON restaurants(source, source_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_city ON restaurants(city);
CREATE INDEX IF NOT EXISTS idx_photos_restaurant ON photos(restaurant_id);
"""


def _get_ta_connection() -> sqlite3.Connection:
    """Подключение к отдельной БД tripadvisor.db."""
    TA_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(TA_DB_PATH), timeout=30)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.row_factory = sqlite3.Row

    # Создаём таблицы если нет
    conn.executescript(TA_SCHEMA)
    conn.commit()

    return conn


PROFILE_DIR = Path(__file__).resolve().parent.parent / "data" / "chrome_profile"


async def _create_browser(headless: bool = True):
    """Запуск Playwright Chromium со stealth-настройками и persistent profile."""
    from playwright.async_api import async_playwright

    pw = await async_playwright().start()

    viewport_w = random.randint(1280, 1920)
    viewport_h = random.randint(720, 1080)

    # Persistent context — сохраняет cookies, localStorage между запусками
    PROFILE_DIR.mkdir(parents=True, exist_ok=True)
    context = await pw.chromium.launch_persistent_context(
        user_data_dir=str(PROFILE_DIR),
        headless=headless,
        args=[
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            "--disable-dev-shm-usage",
        ],
        viewport={"width": viewport_w, "height": viewport_h},
        locale="ru-RU",
        timezone_id="Europe/Moscow",
        user_agent=random.choice(USER_AGENTS),
        ignore_default_args=["--enable-automation"],
    )

    # Берём первую страницу или создаём новую
    if context.pages:
        page = context.pages[0]
    else:
        page = await context.new_page()

    # Stealth
    try:
        from playwright_stealth import stealth_async
        await stealth_async(page)
    except ImportError:
        await page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
            window.chrome = {runtime: {}};
        """)

    # browser=None для persistent context (context уже содержит всё)
    return pw, None, context, page


async def _save_cookies(context):
    """Сохранить cookies для повторного использования."""
    try:
        cookies = await context.cookies()
        COOKIES_FILE.parent.mkdir(parents=True, exist_ok=True)
        COOKIES_FILE.write_text(json.dumps(cookies, ensure_ascii=False), encoding="utf-8")
        print(f"  [cookies] Сохранено {len(cookies)} cookies")
    except Exception as e:
        print(f"  [cookies] Ошибка сохранения: {e}")


async def _solve_captcha_interactive(page, context):
    """
    Если страница содержит CAPTCHA — ждём пока пользователь пройдёт её.
    Работает только в не-headless режиме.
    """
    html = await page.content()
    if "captcha-delivery.com" not in html and "captcha" not in html.lower():
        return True

    print("\n" + "=" * 60)
    print("  CAPTCHA! Пройдите проверку в открытом браузере.")
    print("  После прохождения страница загрузится автоматически.")
    print("=" * 60)

    # Ждём пока CAPTCHA исчезнет (до 300 сек = 5 минут)
    for _ in range(300):
        await asyncio.sleep(1)
        html = await page.content()
        if "captcha-delivery.com" not in html and len(html) > 5000:
            print("  [OK] CAPTCHA пройдена!")
            await _save_cookies(context)
            return True

    print("  [!] Таймаут ожидания CAPTCHA (300 сек)")
    return False


async def _fetch_page(page, url: str, context=None, max_retries: int = 3,
                      wait_selector: str | None = None) -> str | None:
    """
    Загрузить страницу через Playwright.
    Обрабатывает DataDome CAPTCHA, 429, таймауты.
    """
    for attempt in range(1, max_retries + 1):
        try:
            resp = await page.goto(url, wait_until="domcontentloaded", timeout=30000)

            if resp and resp.status == 404:
                return None

            if resp and resp.status == 429:
                wait = 60 + random.randint(0, 60)
                print(f"  [429] Rate limited, ждём {wait}с...")
                await asyncio.sleep(wait)
                continue

            if resp and resp.status >= 500:
                await asyncio.sleep(10 * attempt)
                continue

            # Проверяем CAPTCHA (DataDome)
            html = await page.content()
            if "captcha-delivery.com" in html or len(html) < 3000:
                if context:
                    solved = await _solve_captcha_interactive(page, context)
                    if solved:
                        html = await page.content()
                    else:
                        if attempt < max_retries:
                            await asyncio.sleep(10 * attempt)
                            continue
                        return None
                else:
                    print(f"  [CAPTCHA] Запустите с --visible для прохождения CAPTCHA")
                    return None

            # Ждём конкретный селектор если указан
            if wait_selector:
                try:
                    await page.wait_for_selector(wait_selector, timeout=10000)
                except Exception:
                    pass

            # Прокрутка вниз для имитации человека
            await page.evaluate("window.scrollBy(0, 300)")
            await asyncio.sleep(random.uniform(0.5, 1.5))

            html = await page.content()
            await asyncio.sleep(random.uniform(TA_DELAY_MIN, TA_DELAY_MAX))
            return html

        except Exception as e:
            print(f"  [Browser] Attempt {attempt}/{max_retries}: {e}")
            await asyncio.sleep(10 * attempt)
            continue

    return None


# ─── Сбор URL ресторанов ────────────────────────────────────────────────────

async def discover_restaurant_urls(page, city_key: str,
                                   context=None,
                                   limit: int | None = None) -> list[dict]:
    """
    Пагинация по листингу ресторанов → список URL.
    Возвращает [{"url": ..., "city": ..., "slug": ..., "ta_id": ...}]
    """
    city = CITIES[city_key]
    geo_id = city["geo_id"]
    url_name = city["url_name"]

    all_urls = []
    offset = 0
    page_num = 0
    max_pages = 200  # защита от бесконечного цикла

    print(f"\n[discover] Сбор URL ресторанов: {city['name']}...")

    while page_num < max_pages:
        # Формируем URL листинга
        if offset == 0:
            listing_url = f"{BASE_URL}/Restaurants-g{geo_id}-{url_name}.html"
        else:
            listing_url = f"{BASE_URL}/Restaurants-g{geo_id}-oa{offset}-{url_name}.html"

        html = await _fetch_page(page, listing_url, context=context,
                                 wait_selector='a[href*="Restaurant_Review"]')
        if not html:
            print(f"  [!] Не удалось загрузить листинг page={page_num}")
            break

        # Извлекаем ссылки на рестораны
        links = re.findall(
            r'href="(/Restaurant_Review-g\d+-d(\d+)-Reviews-([^"]+?)\.html)"',
            html
        )

        if not links:
            # Пробуем альтернативный паттерн
            links = re.findall(
                r'href="(/Restaurant_Review-g\d+-d(\d+)-Reviews-[^"]+\.html)"',
                html
            )
            # Переформатируем в тройки
            links = [(l[0], l[1], l[0].split("Reviews-")[-1].replace(".html", ""))
                     for l in links]

        if not links:
            print(f"  [discover] Нет ссылок на странице {page_num}, завершаем")
            break

        # Дедупликация по ta_id
        new_count = 0
        seen_ids = {u["ta_id"] for u in all_urls}
        for href, ta_id, slug_part in links:
            if ta_id in seen_ids:
                continue
            seen_ids.add(ta_id)

            full_url = f"{BASE_URL}{href}"
            slug = f"d{ta_id}-{slug_part}" if slug_part else f"d{ta_id}"
            # Чистим slug
            slug = re.sub(r'-{2,}', '-', slug).strip('-')

            all_urls.append({
                "url": full_url,
                "city": city_key,
                "slug": slug,
                "ta_id": ta_id,
            })
            new_count += 1

        print(f"  [discover] Стр. {page_num + 1}: +{new_count} новых (всего {len(all_urls)})")

        # Проверяем лимит
        if limit and len(all_urls) >= limit:
            all_urls = all_urls[:limit]
            break

        # Есть ли следующая страница?
        has_next = bool(re.search(
            rf'href="[^"]*Restaurants-g{geo_id}-oa{offset + 30}[^"]*"', html
        ))
        if not has_next:
            # Пробуем найти кнопку "Далее"
            has_next = bool(re.search(r'class="[^"]*next[^"]*"', html, re.IGNORECASE))

        if not has_next:
            break

        offset += 30
        page_num += 1
        await asyncio.sleep(random.uniform(TA_PAGE_DELAY_MIN, TA_PAGE_DELAY_MAX))

    print(f"  [discover] {city['name']}: найдено {len(all_urls)} ресторанов")
    return all_urls


# ─── Парсинг страницы ресторана ─────────────────────────────────────────────

def parse_restaurant_page(html: str, url: str, city_key: str,
                          slug: str, ta_id: str) -> dict | None:
    """Извлечь все данные из HTML страницы ресторана."""

    # 1. JSON-LD (приоритетный источник)
    restaurant_data = _extract_json_ld(html)

    # 2. Название (обязательное)
    name = None
    if restaurant_data:
        name = restaurant_data.get("name", "").strip()

    if not name:
        # Fallback: из HTML
        m = re.search(r'<h1[^>]*>([^<]+)</h1>', html)
        if m:
            name = unescape(m.group(1)).strip()

    if not name:
        return None

    # 3. Адрес
    address = None
    lat = None
    lng = None
    if restaurant_data:
        addr_obj = restaurant_data.get("address", {})
        if isinstance(addr_obj, dict):
            parts = [
                addr_obj.get("streetAddress", ""),
                addr_obj.get("addressLocality", ""),
            ]
            address = ", ".join(p for p in parts if p) or None

        geo = restaurant_data.get("geo", {})
        if isinstance(geo, dict):
            lat = _safe_float(geo.get("latitude"))
            lng = _safe_float(geo.get("longitude"))

    if not address:
        m = re.search(r'"streetAddress"\s*:\s*"([^"]+)"', html)
        if m:
            address = unescape(m.group(1))

    if not lat:
        m = re.search(r'"latitude"\s*:\s*([\d.]+)', html)
        if m:
            lat = _safe_float(m.group(1))
    if not lng:
        m = re.search(r'"longitude"\s*:\s*([\d.]+)', html)
        if m:
            lng = _safe_float(m.group(1))

    # 4. Телефон
    phone = None
    if restaurant_data:
        phone = restaurant_data.get("telephone", "")
    if not phone:
        m = re.search(r'href="tel:([^"]+)"', html)
        if m:
            phone = m.group(1)
    phone = phone.strip() if phone else None

    # 5. Вебсайт
    website = None
    if restaurant_data:
        w = restaurant_data.get("url", "")
        if w and "tripadvisor" not in w.lower():
            website = w
    if not website:
        m = re.search(r'data-test-target="restaurant-website"[^>]*href="([^"]+)"', html)
        if m:
            website = m.group(1)

    # 6. Описание
    description = _extract_description(html)

    # 7. Кухни
    cuisines = []
    if restaurant_data:
        sc = restaurant_data.get("servesCuisine", [])
        if isinstance(sc, str):
            cuisines = [sc]
        elif isinstance(sc, list):
            cuisines = sc

    if not cuisines:
        # Fallback: из meta или тегов на странице
        m = re.search(r'"servesCuisine"\s*:\s*\[([^\]]+)\]', html)
        if m:
            cuisines = [c.strip(' "') for c in m.group(1).split(",")]

    # 8. Ценовой диапазон
    price_range, average_bill = _parse_ta_price(restaurant_data, html)

    # 9. Рейтинг и отзывы
    rating = None
    review_count = 0
    if restaurant_data:
        rat_obj = restaurant_data.get("aggregateRating", {})
        if isinstance(rat_obj, dict):
            rating = _safe_float(rat_obj.get("ratingValue"))
            review_count = int(rat_obj.get("reviewCount", 0) or 0)

    if rating is None:
        # Fallback из HTML
        m = re.search(r'"ratingValue"\s*:\s*"?([\d.]+)"?', html)
        if m:
            rating = _safe_float(m.group(1))
        m = re.search(r'"reviewCount"\s*:\s*"?(\d+)"?', html)
        if m:
            review_count = int(m.group(1))

    # 10. Часы работы
    opening_hours = _extract_hours(restaurant_data, html)

    # 11. Метро
    metro = _extract_metro(html)

    # 12. Фичи
    features = _extract_features(html)

    # 13. Фото
    photos = _extract_photos(html)

    # Город
    city_name = CITIES[city_key]["name"]

    return {
        "name": unescape(name),
        "slug": slug,
        "city": city_name,
        "city_code": city_key,
        "address": address,
        "lat": lat,
        "lng": lng,
        "phone": phone,
        "website": website,
        "description": description,
        "cuisines": cuisines,
        "price_range": price_range,
        "average_bill": average_bill,
        "rating": rating,
        "review_count": review_count,
        "opening_hours": opening_hours,
        "metro_station": metro,
        "features": features,
        "photo_urls": photos,
        "source": "tripadvisor",
        "source_id": f"tripadvisor:{ta_id}",
        "source_url": url,
        "ta_id": ta_id,
    }


# ─── Вспомогательные функции парсинга ───────────────────────────────────────

FOOD_TYPES = {"Restaurant", "FoodEstablishment", "CafeOrCoffeeShop",
              "BarOrPub", "FastFoodRestaurant", "Bakery", "IceCreamShop"}


def _extract_json_ld(html: str) -> dict | None:
    """Найти и распарсить JSON-LD с @type Restaurant/FoodEstablishment."""
    blocks = re.findall(
        r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html, re.DOTALL
    )
    for block in blocks:
        try:
            obj = json.loads(block)
            if isinstance(obj, dict):
                if obj.get("@type") in FOOD_TYPES:
                    return obj
                # Иногда обёрнут в @graph
                graph = obj.get("@graph", [])
                for item in graph:
                    if isinstance(item, dict) and item.get("@type") in FOOD_TYPES:
                        return item
            if isinstance(obj, list):
                for item in obj:
                    if isinstance(item, dict) and item.get("@type") in FOOD_TYPES:
                        return item
        except json.JSONDecodeError:
            continue
    return None


def _safe_float(val) -> float | None:
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def _extract_description(html: str) -> str | None:
    """Извлечь описание ресторана из HTML страницы TripAdvisor.

    Приоритет:
    1. Длинный текст перед кнопкой "Подробнее" (настоящее описание ресторана)
    2. og:description (слабый fallback — SEO-текст)
    """
    # 1. Ищем длинные текстовые блоки перед секцией "Особенности"
    idx_features = html.find("Особенности")
    if idx_features < 0:
        idx_features = html.find("Подробнее")
    if idx_features > 0:
        section = html[max(0, idx_features - 15000):idx_features]
        # Ищем текстовые ноды > 80 символов (реальное описание)
        texts = re.findall(r'>([^<]{80,})<', section)
        for t in texts:
            t = t.strip()
            # Пропускаем JSON, скрипты и служебный текст
            if (t and not t.startswith('{') and not t.startswith('window')
                    and 'tripadvisor' not in t.lower()[:30]
                    and 'script' not in t.lower()[:10]
                    and 'function' not in t.lower()[:10]):
                return unescape(t)

    # 2. Fallback: og:description
    m = re.search(
        r'<meta\s+(?:property|name)="og:description"\s+content="([^"]*)"',
        html, re.IGNORECASE
    )
    if not m:
        m = re.search(
            r'<meta\s+content="([^"]*)"\s+(?:property|name)="og:description"',
            html, re.IGNORECASE
        )
    if m:
        desc = unescape(m.group(1)).strip()
        if len(desc) > 30:
            return desc
    return None


def _parse_ta_price(restaurant_data: dict | None,
                    html: str) -> tuple[str | None, int | None]:
    """Конвертация ценового уровня TripAdvisor."""
    price_str = None
    if restaurant_data:
        price_str = restaurant_data.get("priceRange", "")

    if not price_str:
        m = re.search(r'"priceRange"\s*:\s*"([^"]+)"', html)
        if m:
            price_str = m.group(1)

    if not price_str:
        return None, None

    # TripAdvisor использует $ символы или рублёвые диапазоны
    dollar_count = price_str.count("$")
    if dollar_count == 1:
        return "₽", 500
    elif dollar_count == 2:
        return "₽₽", 1500
    elif dollar_count == 3:
        return "₽₽₽", 3000
    elif dollar_count >= 4:
        return "₽₽₽₽", 5000

    # Пробуем извлечь числа (если формат "500 - 2000 ₽")
    nums = re.findall(r"\d+", price_str.replace("\xa0", "").replace(" ", ""))
    if len(nums) >= 2:
        return price_str, (int(nums[0]) + int(nums[1])) // 2
    elif len(nums) == 1:
        return price_str, int(nums[0])

    return price_str, None


def _extract_hours(restaurant_data: dict | None, html: str) -> list[str]:
    """Извлечь часы работы."""
    hours = []

    if restaurant_data:
        oh = restaurant_data.get("openingHours", [])
        if isinstance(oh, str):
            hours = [oh]
        elif isinstance(oh, list):
            hours = [h for h in oh if isinstance(h, str)]

        # openingHoursSpecification
        specs = restaurant_data.get("openingHoursSpecification", [])
        if isinstance(specs, list):
            for spec in specs:
                if not isinstance(spec, dict):
                    continue
                days_raw = spec.get("dayOfWeek", [])
                if isinstance(days_raw, str):
                    days = [days_raw]
                elif isinstance(days_raw, list):
                    days = days_raw
                else:
                    continue
                opens = spec.get("opens", "")
                closes = spec.get("closes", "")
                if opens and closes:
                    # dayOfWeek может быть URL или короткое имя
                    day_map_full = {
                        "Monday": "Mo", "Tuesday": "Tu", "Wednesday": "We",
                        "Thursday": "Th", "Friday": "Fr", "Saturday": "Sa",
                        "Sunday": "Su",
                    }
                    day_shorts = []
                    for d in days:
                        d_name = d.split("/")[-1] if "/" in d else d
                        short = day_map_full.get(d_name, d_name[:2])
                        day_shorts.append(short)
                    if day_shorts:
                        # Убираем секунды из HH:MM:SS → HH:MM
                        opens = opens[:5] if len(opens) > 5 else opens
                        closes = closes[:5] if len(closes) > 5 else closes
                        day_str = ",".join(day_shorts)
                        hours.append(f"{day_str} {opens}-{closes}")

    if not hours:
        # Fallback: парсим русский текст
        for m in re.finditer(
            r'((?:Пн|Вт|Ср|Чт|Пт|Сб|Вс)[^<]{0,50}?\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}:\d{2})',
            html
        ):
            raw = m.group(1).strip()
            hours.append(_convert_ru_hours(raw))

    return hours


def _convert_ru_hours(text: str) -> str:
    """Конвертировать русские часы в Schema.org формат."""
    result = text
    for ru, en in RU_DAY_MAP.items():
        result = re.sub(ru, en, result, flags=re.IGNORECASE)
    result = result.replace("–", "-").replace("—", "-")
    return result.strip()


def _extract_metro(html: str) -> str | None:
    """Извлечь метро из текста страницы."""
    m = re.search(r'(?:м\.\s*|метро\s+)([А-Яа-яЁё\s-]+?)(?:[,<"\)\.])', html)
    if m:
        metro = m.group(1).strip()
        if 3 < len(metro) < 50:
            return metro
    return None


def _extract_features(html: str) -> list[str]:
    """Извлечь фичи из HTML секции 'Особенности' на TripAdvisor.

    Приоритет:
    1. Структурированные span.alXOW из секции "Особенности"
    2. Keyword fallback по всему HTML
    """
    features = []

    # 1. Ищем секцию "Особенности" и извлекаем span-ы с фичами
    idx = html.find("Особенности")
    if idx >= 0:
        # Берём блок после "Особенности" (до следующей крупной секции)
        chunk = html[idx:idx + 5000]
        # Извлекаем текст из span.alXOW (содержат группы фич)
        raw_features = re.findall(
            r'<span\s+class="alXOW[^"]*">([^<]+)</span>', chunk
        )
        for group in raw_features:
            # Каждый span может содержать несколько фич через запятую
            for f in group.split(","):
                f = unescape(f).strip()
                if f and f not in features:
                    features.append(f)

    # 2. Keyword fallback (если секция "Особенности" не найдена)
    if not features:
        html_lower = html.lower()
        for keyword, feature in FEATURE_KEYWORDS.items():
            if keyword in html_lower and feature not in features:
                features.append(feature)

    return features


def _extract_photos(html: str) -> list[str]:
    """Извлечь URL фотографий с CDN TripAdvisor."""
    photos = []
    seen_ids = set()

    # Паттерн CDN TripAdvisor
    for m in re.finditer(
        r'(https?://media-cdn\.tripadvisor\.com/media/photo-[a-z]/([a-f0-9]+)/[^"\'>\s]+\.(?:jpg|jpeg|png|webp))',
        html, re.IGNORECASE
    ):
        url = m.group(1)
        photo_id = m.group(2)

        if photo_id in seen_ids:
            continue
        seen_ids.add(photo_id)

        # Пробуем заменить на оригинальный размер
        url_large = re.sub(r'/photo-[a-z]/', '/photo-o/', url)
        photos.append(url_large)

    # Альтернативный паттерн (data-lazyurl или другие атрибуты)
    for m in re.finditer(
        r'(?:data-lazyurl|data-src)="(https?://media-cdn\.tripadvisor\.com/[^"]+\.(?:jpg|jpeg|png|webp))"',
        html, re.IGNORECASE
    ):
        url = m.group(1)
        # Извлекаем ID для дедупликации
        id_m = re.search(r'/([a-f0-9]{10,})/', url)
        if id_m:
            pid = id_m.group(1)
            if pid in seen_ids:
                continue
            seen_ids.add(pid)
        url_large = re.sub(r'/photo-[a-z]/', '/photo-o/', url)
        if url_large not in photos:
            photos.append(url_large)

    return photos[:30]  # макс 30 фото


# ─── Сохранение в pipeline.db ───────────────────────────────────────────────

def save_to_db(conn: sqlite3.Connection, data: dict) -> bool:
    """Сохранить ресторан в БД (паттерн как afisha/restoclub)."""
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
            city_slug = make_slug(data["city"])
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
    slug = f"ta-{data['city_code']}-{data['ta_id']}"

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
                name = EXCLUDED.name,
                address = COALESCE(EXCLUDED.address, restaurants.address),
                metro_station = COALESCE(EXCLUDED.metro_station, restaurants.metro_station),
                lat = COALESCE(EXCLUDED.lat, restaurants.lat),
                lng = COALESCE(EXCLUDED.lng, restaurants.lng),
                description = COALESCE(EXCLUDED.description, restaurants.description),
                cuisine = COALESCE(EXCLUDED.cuisine, restaurants.cuisine),
                price_range = COALESCE(EXCLUDED.price_range, restaurants.price_range),
                average_bill = COALESCE(EXCLUDED.average_bill, restaurants.average_bill),
                rating = EXCLUDED.rating,
                review_count = EXCLUDED.review_count,
                opening_hours = COALESCE(EXCLUDED.opening_hours, restaurants.opening_hours),
                features = EXCLUDED.features,
                phone = COALESCE(EXCLUDED.phone, restaurants.phone),
                website = COALESCE(EXCLUDED.website, restaurants.website),
                updated_at = datetime('now')
        """, (
            data["name"], slug, data["city"], city_id,
            data["address"], data["metro_station"],
            data["lat"], data["lng"],
            data["phone"], data["website"],
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
        # Конфликт slug — добавляем суффикс
        slug = f"{slug}-ta"
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
                data["phone"], data["website"],
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
                    VALUES (?, ?, 'interior', 'tripadvisor', ?)
                """, (rest_id, photo_url, 1 if i == 0 else 0))
            except Exception:
                pass

    # Кухни → restaurant_cuisines
    for cuisine_name in data["cuisines"]:
        cuisine_name = cuisine_name.strip()
        if not cuisine_name:
            continue
        c_slug = make_slug(cuisine_name)
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
    """Парсинг и сохранение рабочих часов."""
    if not hours:
        return

    for entry in hours:
        m = re.match(r"([A-Za-z,\-]+)[:\s]+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})", entry)
        if not m:
            continue

        days_str, open_time, close_time = m.group(1), m.group(2), m.group(3)

        day_nums = []
        for part in days_str.split(","):
            if "-" in part:
                start, end = part.split("-", 1)
                s = EN_DAY_MAP.get(start.strip())
                e = EN_DAY_MAP.get(end.strip())
                if s is not None and e is not None:
                    if s <= e:
                        day_nums.extend(range(s, e + 1))
                    else:
                        day_nums.extend(range(s, 7))
                        day_nums.extend(range(0, e + 1))
            else:
                d = EN_DAY_MAP.get(part.strip())
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


# ─── Кеш ────────────────────────────────────────────────────────────────────

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


# ─── Индекс ─────────────────────────────────────────────────────────────────

def _ensure_index(conn: sqlite3.Connection):
    conn.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurants_source_source_id
        ON restaurants(source, source_id)
    """)
    conn.commit()


def get_scraped_ids(conn: sqlite3.Connection) -> set[str]:
    rows = conn.execute(
        "SELECT source_id FROM restaurants WHERE source = 'tripadvisor'"
    ).fetchall()
    return {r[0] for r in rows}


# ─── Основной процесс ──────────────────────────────────────────────────────

async def _run_async(city_filter: str | None = None, limit: int | None = None,
                     resume: bool = False, no_cache: bool = False,
                     visible: bool = False):
    """Асинхронный основной процесс."""
    conn = _get_ta_connection()
    _ensure_index(conn)

    # Определяем города
    if city_filter:
        if city_filter not in CITIES:
            print(f"[!] Город '{city_filter}' не найден. Доступные: {list(CITIES.keys())}")
            return
        target_cities = [city_filter]
    else:
        target_cities = list(CITIES.keys())

    # Первый запуск или нет cookies — запускаем видимый браузер
    headless = not visible
    if not COOKIES_FILE.exists():
        headless = False
        print("[!] Cookies не найдены — запускаю видимый браузер для прохождения CAPTCHA")

    # Запуск браузера
    print("[browser] Запуск Playwright Chromium...")
    pw, browser, context, page = await _create_browser(headless=headless)

    try:
        # Сбор URL для всех городов
        all_places = []
        for city_key in target_cities:
            urls = await discover_restaurant_urls(page, city_key,
                                                  context=context, limit=limit)
            all_places.extend(urls)

        print(f"\n[total] Найдено URL ресторанов: {len(all_places)}")

        # Resume
        if resume:
            already = get_scraped_ids(conn)
            before = len(all_places)
            all_places = [p for p in all_places
                          if f"tripadvisor:{p['ta_id']}" not in already]
            print(f"[resume] Пропускаем {before - len(all_places)} уже спарсенных, "
                  f"осталось {len(all_places)}")

        if limit:
            all_places = all_places[:limit]

        if not all_places:
            print("[!] Нет ресторанов для парсинга")
            return

        print(f"\n[scrape] Начинаем парсинг {len(all_places)} ресторанов...")
        pass  # scrape started

        saved = 0
        errors = 0
        skipped = 0
        pages_since_restart = 0

        pbar = tqdm(all_places, desc="TripAdvisor", unit="rest")
        for place in pbar:
            url = place["url"]
            city = place["city"]
            slug = place["slug"]
            ta_id = place["ta_id"]

            pbar.set_postfix({"saved": saved, "err": errors, "city": city})

            # Перезапуск браузера каждые 500 страниц
            pages_since_restart += 1
            if pages_since_restart > 500:
                print("\n  [browser] Перезапуск браузера (каждые 500 стр.)...")
                await context.close()
                await asyncio.sleep(5)
                _, _, context, page = await _create_browser(headless=headless)
                pages_since_restart = 0

            # Кеш
            html = None
            if not no_cache:
                html = _load_cached(city, slug)

            if not html:
                html = await _fetch_page(page, url, context=context)
                if not html:
                    errors += 1
                    continue
                if not no_cache:
                    _save_cache(city, slug, html)

            # Парсим
            data = parse_restaurant_page(html, url, city, slug, ta_id)
            if not data:
                skipped += 1
                continue

            # Сохраняем
            for _attempt in range(3):
                try:
                    if save_to_db(conn, data):
                        saved += 1
                    break
                except sqlite3.OperationalError:
                    time.sleep(2)

            if saved % 50 == 0 and saved > 0:
                try:
                    conn.commit()
                except sqlite3.OperationalError:
                    time.sleep(2)
                    conn.commit()

        conn.commit()
        print(f"\n[done] Сохранено: {saved}, ошибок: {errors}, пропущено: {skipped}")
        pass  # scrape completed

    finally:
        conn.close()
        await context.close()
        if browser:
            await browser.close()
        await pw.stop()


def run_parse_cache():
    """Парсинг только закешированных HTML файлов (без браузера)."""
    conn = _get_ta_connection()
    _ensure_index(conn)

    saved = 0
    errors = 0
    skipped = 0

    for city_key in CITIES:
        city_dir = CACHE_DIR / city_key
        if not city_dir.exists():
            continue

        html_files = sorted(city_dir.glob("*.html"))
        print(f"\n[cache] {CITIES[city_key]['name']}: {len(html_files)} файлов")

        for html_file in tqdm(html_files, desc=CITIES[city_key]["name"], unit="rest"):
            slug = html_file.stem  # имя файла без .html
            # Извлекаем ta_id из slug (формат: d{id}-name)
            m = re.match(r"d(\d+)", slug)
            if not m:
                skipped += 1
                continue
            ta_id = m.group(1)

            html = html_file.read_text(encoding="utf-8", errors="replace")
            if len(html) < 5000:
                skipped += 1
                continue

            url = f"{BASE_URL}/Restaurant_Review-g{CITIES[city_key]['geo_id']}-d{ta_id}-Reviews-{slug}.html"
            data = parse_restaurant_page(html, url, city_key, slug, ta_id)
            if not data:
                skipped += 1
                continue

            for _attempt in range(5):
                try:
                    if save_to_db(conn, data):
                        saved += 1
                    break
                except sqlite3.OperationalError:
                    time.sleep(2 * (_attempt + 1))
            else:
                errors += 1

        try:
            conn.commit()
        except sqlite3.OperationalError:
            time.sleep(5)
            conn.commit()

    conn.close()
    print(f"\n[done] Сохранено: {saved}, ошибок: {errors}, пропущено: {skipped}")


def run(city_filter: str | None = None, limit: int | None = None,
        resume: bool = False, no_cache: bool = False, visible: bool = False):
    """Синхронная обёртка для main.py."""
    asyncio.run(_run_async(
        city_filter=city_filter,
        limit=limit,
        resume=resume,
        no_cache=no_cache,
        visible=visible,
    ))


# ─── CLI ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="TripAdvisor restaurant scraper")
    parser.add_argument("--city", choices=list(CITIES.keys()),
                        help="Фильтр по городу (moscow, spb)")
    parser.add_argument("--limit", type=int, help="Лимит ресторанов на город")
    parser.add_argument("--resume", action="store_true",
                        help="Продолжить с места остановки")
    parser.add_argument("--no-cache", action="store_true",
                        help="Не использовать кеш HTML")
    parser.add_argument("--visible", action="store_true",
                        help="Показать браузер (для прохождения CAPTCHA)")
    parser.add_argument("--parse-cache", action="store_true",
                        help="Только парсинг закешированных HTML (без браузера)")
    args = parser.parse_args()

    if args.parse_cache:
        run_parse_cache()
    else:
        run(
            city_filter=args.city,
            limit=args.limit,
            resume=args.resume,
            no_cache=args.no_cache,
            visible=args.visible,
        )


if __name__ == "__main__":
    main()
