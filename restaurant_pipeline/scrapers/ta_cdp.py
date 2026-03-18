"""
TripAdvisor scraper через CDP (Chrome DevTools Protocol).
Подключается к уже запущенному Chrome с --remote-debugging-port=9222.

Запуск:
  1. Закрой Chrome
  2. Запусти: chrome.exe --remote-debugging-port=9222 --user-data-dir="C:/Users/kosov/chrome-debug"
  3. Открой tripadvisor.ru, пройди CAPTCHA если есть
  4. python -m scrapers.ta_cdp --city spb --limit 6
"""
import argparse
import json
import random
import re
import sqlite3
import sys
import time
from pathlib import Path

from tqdm import tqdm

from utils.slugify import make_slug

# Fix Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Импортируем save_to_db и парсер из основного модуля
from scrapers.tripadvisor import (
    CITIES, BASE_URL, CACHE_DIR, TA_DB_PATH,
    TA_DELAY_MIN, TA_DELAY_MAX, TA_PAGE_DELAY_MIN, TA_PAGE_DELAY_MAX,
    parse_restaurant_page, save_to_db, _get_ta_connection,
    _load_cached, _save_cache, _ensure_index,
)

CDP_URL = "http://127.0.0.1:9222"


def discover_urls_cdp(page, city_key: str, limit: int | None = None) -> list[dict]:
    """Сбор URL ресторанов через пагинацию в реальном Chrome."""
    city = CITIES[city_key]
    geo_id = city["geo_id"]

    all_urls = []
    offset = 0
    max_pages = 200

    print(f"\n[discover] Сбор URL: {city['name']}...")

    while offset // 30 < max_pages:
        # Формируем URL
        if offset == 0:
            listing_url = f"{BASE_URL}/Restaurants-g{geo_id}-{city['url_name']}.html"
        else:
            listing_url = f"{BASE_URL}/Restaurants-g{geo_id}-oa{offset}-{city['url_name']}.html"

        page.goto(listing_url, wait_until="domcontentloaded", timeout=30000)
        time.sleep(random.uniform(3, 5))

        # Прокрутим чтобы загрузить lazy-контент
        page.evaluate("window.scrollBy(0, 1000)")
        time.sleep(1)

        html = page.content()

        # Проверка CAPTCHA
        if "captcha-delivery.com" in html or len(html) < 5000:
            print("  [!] CAPTCHA! Пройди её в Chrome и нажми Enter здесь...")
            input("  >>> Нажми Enter после прохождения CAPTCHA...")
            html = page.content()
            if "captcha-delivery.com" in html:
                print("  [!] CAPTCHA всё ещё есть, пропускаем")
                break

        # Извлекаем ссылки
        links = re.findall(
            r'href="(/Restaurant_Review-g\d+-d(\d+)-Reviews-([^"]+?)\.html)"',
            html
        )

        if not links:
            print(f"  [discover] Нет ссылок на стр. {offset // 30 + 1}, завершаем")
            break

        # Дедуп
        seen_ids = {u["ta_id"] for u in all_urls}
        new_count = 0
        for href, ta_id, slug_part in links:
            if ta_id in seen_ids:
                continue
            seen_ids.add(ta_id)
            slug = f"d{ta_id}-{slug_part}"
            slug = re.sub(r'-{2,}', '-', slug).strip('-')
            all_urls.append({
                "url": f"{BASE_URL}{href}",
                "city": city_key,
                "slug": slug,
                "ta_id": ta_id,
            })
            new_count += 1

        print(f"  [discover] Стр. {offset // 30 + 1}: +{new_count} (всего {len(all_urls)})")

        if limit and len(all_urls) >= limit:
            all_urls = all_urls[:limit]
            break

        # Проверяем следующую страницу
        has_next = bool(re.search(
            rf'href="[^"]*Restaurants-g{geo_id}-oa{offset + 30}[^"]*"', html
        ))
        if not has_next:
            break

        offset += 30
        time.sleep(random.uniform(TA_PAGE_DELAY_MIN, TA_PAGE_DELAY_MAX))

    print(f"  [discover] {city['name']}: итого {len(all_urls)} ресторанов")
    return all_urls


def scrape_cdp(city_filter: str | None = None, limit: int | None = None,
               resume: bool = False, no_cache: bool = False):
    """Основной процесс парсинга через CDP."""
    from playwright.sync_api import sync_playwright

    conn = _get_ta_connection()
    _ensure_index(conn)

    # Города
    if city_filter:
        if city_filter not in CITIES:
            print(f"[!] Город не найден. Доступные: {list(CITIES.keys())}")
            return
        target_cities = [city_filter]
    else:
        target_cities = list(CITIES.keys())

    # Подключаемся к Chrome
    print(f"[CDP] Подключаемся к Chrome на {CDP_URL}...")
    pw = sync_playwright().start()
    try:
        browser = pw.chromium.connect_over_cdp(CDP_URL)
    except Exception as e:
        print(f"[!] Не удалось подключиться к Chrome: {e}")
        print("    Убедись что Chrome запущен с --remote-debugging-port=9222")
        pw.stop()
        return

    ctx = browser.contexts[0]
    page = ctx.pages[0] if ctx.pages else ctx.new_page()

    # Сбор URL
    all_places = []
    for city_key in target_cities:
        urls = discover_urls_cdp(page, city_key, limit=limit)
        all_places.extend(urls)

    print(f"\n[total] Найдено: {len(all_places)} ресторанов")

    # Resume
    if resume:
        already = conn.execute(
            "SELECT source_id FROM restaurants WHERE source = 'tripadvisor'"
        ).fetchall()
        already_set = {r[0] for r in already}
        before = len(all_places)
        all_places = [p for p in all_places
                      if f"tripadvisor:{p['ta_id']}" not in already_set]
        print(f"[resume] Пропускаем {before - len(all_places)}, осталось {len(all_places)}")

    if not all_places:
        print("[!] Нет ресторанов для парсинга")
        pw.stop()
        conn.close()
        return

    # Парсинг
    print(f"\n[scrape] Парсим {len(all_places)} ресторанов...")
    saved = 0
    errors = 0
    skipped = 0

    pbar = tqdm(all_places, desc="TripAdvisor", unit="rest")
    for place in pbar:
        url = place["url"]
        city = place["city"]
        slug = place["slug"]
        ta_id = place["ta_id"]

        pbar.set_postfix({"saved": saved, "err": errors, "city": city})

        # Кеш
        html = None
        if not no_cache:
            html = _load_cached(city, slug)

        if not html:
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=30000)
                time.sleep(random.uniform(1, 2))
                page.evaluate("window.scrollBy(0, 500)")
                time.sleep(random.uniform(TA_DELAY_MIN, TA_DELAY_MAX))
                html = page.content()

                # Проверка CAPTCHA
                if "captcha-delivery.com" in html or len(html) < 5000:
                    print(f"\n  [!] CAPTCHA на {slug}! Пройди в Chrome и нажми Enter...")
                    input("  >>> Enter после CAPTCHA...")
                    html = page.content()

                if len(html) > 5000 and not no_cache:
                    _save_cache(city, slug, html)

            except Exception as e:
                errors += 1
                continue

        if not html or len(html) < 5000:
            errors += 1
            continue

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
            conn.commit()

    conn.commit()
    conn.close()
    pw.stop()

    print(f"\n[done] Сохранено: {saved}, ошибок: {errors}, пропущено: {skipped}")
    print(f"  БД: {TA_DB_PATH}")


def main():
    parser = argparse.ArgumentParser(description="TripAdvisor CDP scraper")
    parser.add_argument("--city", choices=list(CITIES.keys()),
                        help="moscow или spb")
    parser.add_argument("--limit", type=int, help="Лимит ресторанов")
    parser.add_argument("--resume", action="store_true",
                        help="Продолжить с места остановки")
    parser.add_argument("--no-cache", action="store_true",
                        help="Не использовать кеш")
    args = parser.parse_args()

    scrape_cdp(
        city_filter=args.city,
        limit=args.limit,
        resume=args.resume,
        no_cache=args.no_cache,
    )


if __name__ == "__main__":
    main()
