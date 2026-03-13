"""
Импорт ресторанов из OpenStreetMap через Overpass API.
"""
import json
import time
import sqlite3
from pathlib import Path
from tqdm import tqdm
from utils.db import get_connection, log_import
from utils.http import fetch
from utils.slugify import make_unique_slug
from config.settings import (
    OVERPASS_URL, OVERPASS_URLS, OVERPASS_TIMEOUT, OVERPASS_DELAY,
    RAW_DIR, OSM_AMENITY_TAGS
)
from config.cities import get_all_cities, HIGH_PRIORITY, MEDIUM_PRIORITY, BASIC_PRIORITY


def _build_overpass_query(lat: float, lon: float, radius_km: int,
                          amenities: list[str]) -> str:
    """Построить Overpass QL запрос."""
    radius_m = radius_km * 1000
    amenity_filter = "|".join(amenities)
    return f"""
[out:json][timeout:{OVERPASS_TIMEOUT}];
(
  node["amenity"~"^({amenity_filter})$"](around:{radius_m},{lat},{lon});
  way["amenity"~"^({amenity_filter})$"](around:{radius_m},{lat},{lon});
);
out center tags;
"""


def _build_single_amenity_query(lat: float, lon: float, radius_km: int,
                                 amenity: str) -> str:
    """Построить Overpass QL запрос для одного типа amenity (для плотных зон)."""
    radius_m = radius_km * 1000
    return f"""
[out:json][timeout:{OVERPASS_TIMEOUT}];
(
  node["amenity"="{amenity}"](around:{radius_m},{lat},{lon});
  way["amenity"="{amenity}"](around:{radius_m},{lat},{lon});
);
out center tags;
"""


def _extract_restaurant(element: dict, city_name: str) -> dict | None:
    """Извлечь данные ресторана из элемента OSM."""
    tags = element.get('tags', {})
    name = tags.get('name') or tags.get('name:ru')
    if not name:
        return None

    # Координаты
    lat = element.get('lat')
    lon = element.get('lon')
    if not lat and 'center' in element:
        lat = element['center'].get('lat')
        lon = element['center'].get('lon')
    if not lat:
        return None

    # Адрес
    addr_parts = []
    if tags.get('addr:street'):
        addr_parts.append(tags['addr:street'])
    if tags.get('addr:housenumber'):
        addr_parts.append(tags['addr:housenumber'])
    address = ', '.join(addr_parts) if addr_parts else None

    # Кухня
    cuisine = tags.get('cuisine', '')
    cuisine_list = [c.strip() for c in cuisine.split(';') if c.strip()] if cuisine else []

    # Телефон
    phone = tags.get('phone') or tags.get('contact:phone')

    # Сайт
    website = tags.get('website') or tags.get('contact:website')

    # Часы работы
    opening_hours = tags.get('opening_hours')

    return {
        'name': name.strip(),
        'city': city_name,
        'address': address,
        'lat': lat,
        'lng': lon,
        'phone': phone,
        'website': website,
        'email': tags.get('email') or tags.get('contact:email'),
        'description': tags.get('description') or tags.get('description:ru'),
        'cuisine': json.dumps(cuisine_list, ensure_ascii=False) if cuisine_list else None,
        'opening_hours': opening_hours,
        'source': 'osm',
        'source_id': str(element.get('id', '')),
        'osm_type': element.get('type', 'node'),
        'amenity': tags.get('amenity', 'restaurant'),
    }


def _normalize_city_name(name: str) -> str:
    """Убрать суффикс зоны: 'Москва-Центр' -> 'Москва', 'СПб-Юг' -> 'Санкт-Петербург'."""
    if name.startswith("Москва"):
        return "Москва"
    if name.startswith("СПб"):
        return "Санкт-Петербург"
    return name


def _fetch_overpass(query: str) -> dict | None:
    """Выполнить запрос к Overpass API с fallback по серверам. Одна попытка на сервер."""
    import requests as req
    for server_url in OVERPASS_URLS:
        try:
            resp = req.get(
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


def _is_dense_zone(city_name: str) -> bool:
    """Проверить, является ли зона плотной (Москва/СПб) - нужно дробить запросы."""
    return city_name.startswith("Москва") or city_name.startswith("СПб")


def fetch_city(city_name: str, lat: float, lon: float,
               radius_km: int) -> list[dict]:
    """Загрузить рестораны одного города из OSM."""
    normalized_city = _normalize_city_name(city_name)
    seen_ids = set()
    restaurants = []

    if _is_dense_zone(city_name):
        # Для плотных зон - запрашиваем каждый amenity отдельно
        for amenity in OSM_AMENITY_TAGS:
            query = _build_single_amenity_query(lat, lon, radius_km, amenity)
            data = _fetch_overpass(query)
            if data is None:
                print(f"\n    [!] Не удалось загрузить {amenity} для {city_name}")
                continue
            for el in data.get('elements', []):
                eid = el.get('id')
                if eid in seen_ids:
                    continue
                seen_ids.add(eid)
                rest = _extract_restaurant(el, normalized_city)
                if rest:
                    restaurants.append(rest)
            # Пауза между запросами amenity (больше чем между городами)
            time.sleep(OVERPASS_DELAY + 2)
    else:
        # Для обычных городов - один запрос со всеми amenity
        query = _build_overpass_query(lat, lon, radius_km, OSM_AMENITY_TAGS)
        data = _fetch_overpass(query)
        if data is None:
            print(f"\n  [!] Все серверы недоступны для {city_name}")
            return []
        for el in data.get('elements', []):
            rest = _extract_restaurant(el, normalized_city)
            if rest:
                restaurants.append(rest)

    return restaurants


def save_raw_osm(city_name: str, restaurants: list[dict]):
    """Сохранить сырые данные OSM на диск."""
    osm_dir = RAW_DIR / "osm"
    osm_dir.mkdir(parents=True, exist_ok=True)
    filename = osm_dir / f"{city_name.replace(' ', '_')}.json"
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(restaurants, f, ensure_ascii=False, indent=2)


def import_osm_to_db(restaurants: list[dict], conn: sqlite3.Connection) -> int:
    """Записать рестораны OSM в pipeline DB."""
    existing_slugs = set()
    # Загрузить существующие slug
    for row in conn.execute("SELECT slug FROM restaurants WHERE slug IS NOT NULL"):
        existing_slugs.add(row[0])

    count = 0
    for rest in restaurants:
        slug = make_unique_slug(rest['name'], existing_slugs)

        # Проверяем дубликат по source_id
        existing = conn.execute(
            "SELECT id FROM restaurants WHERE source = 'osm' AND source_id = ?",
            (rest['source_id'],)
        ).fetchone()
        if existing:
            continue

        try:
            conn.execute(
                """INSERT INTO restaurants (
                    name, slug, city, address, lat, lng,
                    phone, email, website, description,
                    cuisine, opening_hours,
                    source, source_id, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'osm', ?, 'active')""",
                (rest['name'], slug, rest['city'], rest['address'],
                 rest['lat'], rest['lng'],
                 rest['phone'], rest['email'], rest['website'],
                 rest['description'], rest['cuisine'],
                 rest['opening_hours'], rest['source_id'])
            )
            count += 1
        except Exception as e:
            if count < 5:
                print(f"  [!] {rest['name']}: {e}")

    conn.commit()
    return count


def run_osm_import(cities: list[tuple] = None, save_raw: bool = True):
    """
    Запуск импорта из OSM.
    cities: список кортежей (name, lat, lon, radius_km).
    По умолчанию — все города.
    """
    if cities is None:
        cities = get_all_cities()

    print(f"\n{'='*60}")
    print(f"OSM IMPORT: {len(cities)} городов")
    print(f"{'='*60}\n")

    conn = get_connection()
    log_import('osm', 'full_import', 'started')
    total_count = 0

    for i, (city_name, lat, lon, radius) in enumerate(cities, 1):
        print(f"[{i}/{len(cities)}] {city_name} (r={radius}km)...", end=" ", flush=True)

        restaurants = fetch_city(city_name, lat, lon, radius)
        print(f"найдено {len(restaurants)}", end="", flush=True)

        if save_raw and restaurants:
            save_raw_osm(city_name, restaurants)

        if restaurants:
            inserted = import_osm_to_db(restaurants, conn)
            print(f", записано {inserted}")
            total_count += inserted
        else:
            print()

        # Пауза между городами
        if i < len(cities):
            time.sleep(OVERPASS_DELAY)

    print(f"\n{'='*60}")
    print(f"OSM IMPORT ИТОГО: {total_count} ресторанов")
    print(f"{'='*60}")

    log_import('osm', 'full_import', 'completed', total_count)
    conn.close()


def run_osm_import_priority(priority: str = 'high'):
    """Импорт только выбранного приоритета."""
    if priority == 'high':
        cities = HIGH_PRIORITY
    elif priority == 'medium':
        cities = HIGH_PRIORITY + MEDIUM_PRIORITY
    else:
        cities = get_all_cities()
    run_osm_import(cities)


if __name__ == '__main__':
    from utils.db import init_db
    init_db()
    # Начинаем с высокого приоритета (Москва, СПб)
    run_osm_import_priority('high')
