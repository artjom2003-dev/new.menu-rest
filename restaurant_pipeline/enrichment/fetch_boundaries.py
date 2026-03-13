"""
Скачивание границ районов Москвы и СПб из Overpass API.
Запрашивает по одному округу/району за раз чтобы не получить таймаут.
Сохраняет результаты в data/processed/boundaries_*.json для повторного использования.
"""
import sys
import os
import json
import time

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import requests

OVERPASS_ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]

CACHE_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'processed')


def _overpass_query(query: str, timeout: int = 120) -> dict:
    """Execute Overpass query with endpoint rotation and retries."""
    for attempt in range(3):
        for endpoint in OVERPASS_ENDPOINTS:
            try:
                resp = requests.post(
                    endpoint,
                    data={'data': query},
                    timeout=timeout,
                    headers={'User-Agent': 'MenuRest-Pipeline/1.0'}
                )
                resp.raise_for_status()
                data = resp.json()
                if data.get('elements'):
                    return data
            except Exception as e:
                short = endpoint.split('//')[1].split('/')[0]
                print(f"      [!] {short}: {type(e).__name__}")
                time.sleep(2)
                continue
        print(f"    Retry {attempt + 1}/3...")
        time.sleep(5)
    raise RuntimeError("All Overpass endpoints failed after retries")


def fetch_moscow_districts():
    """Fetch Moscow district boundaries one by one."""
    cache_file = os.path.join(CACHE_DIR, 'boundaries_moscow.json')
    if os.path.exists(cache_file):
        print(f"  Кэш найден: {cache_file}")
        with open(cache_file, 'r', encoding='utf-8') as f:
            return json.load(f)

    print("  Загрузка округов Москвы...")

    # Moscow okrugs (admin_level=5) - fetch all at once with generous timeout
    # Area ID for Moscow: 3600102269 (relation 102269)
    # Actually let's use 3602555133 which is the standard Moscow area
    query = """
    [out:json][timeout:300];
    area(3602555133)->.moscow;
    rel(area.moscow)["admin_level"="5"]["boundary"="administrative"];
    out body geom;
    """

    try:
        data = _overpass_query(query, timeout=300)
        elements = data.get('elements', [])
        print(f"    Округа (admin_level=5): {len(elements)} элементов")
    except Exception as e:
        print(f"    [!] Не удалось загрузить округа: {e}")
        elements = []

    # If we got okrugs, also try rayony (admin_level=8)
    rayony = []
    if len(elements) >= 8:  # Moscow has ~12 okrugs
        print("  Загрузка районов Москвы (admin_level=8)...")
        query_r = """
        [out:json][timeout:300];
        area(3602555133)->.moscow;
        rel(area.moscow)["admin_level"="8"]["boundary"="administrative"];
        out body geom;
        """
        try:
            data_r = _overpass_query(query_r, timeout=300)
            rayony = data_r.get('elements', [])
            print(f"    Районы (admin_level=8): {len(rayony)} элементов")
        except Exception as e:
            print(f"    [!] Не удалось загрузить районы: {e}")

    result = {
        'okrugs': elements,
        'rayony': rayony,
    }

    os.makedirs(CACHE_DIR, exist_ok=True)
    with open(cache_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False)
    print(f"    Сохранено в кэш: {cache_file}")

    return result


def fetch_spb_districts():
    """Fetch SPb district boundaries."""
    cache_file = os.path.join(CACHE_DIR, 'boundaries_spb.json')
    if os.path.exists(cache_file):
        print(f"  Кэш найден: {cache_file}")
        with open(cache_file, 'r', encoding='utf-8') as f:
            return json.load(f)

    print("  Загрузка районов СПб...")

    # SPb area: relation 337422 -> area 3600337422
    query = """
    [out:json][timeout:300];
    area(3600337422)->.spb;
    rel(area.spb)["admin_level"="5"]["boundary"="administrative"];
    out body geom;
    """

    try:
        data = _overpass_query(query, timeout=300)
        elements = data.get('elements', [])
        print(f"    Районы (admin_level=5): {len(elements)} элементов")
    except Exception as e:
        print(f"    [!] Не удалось загрузить: {e}")
        elements = []

    result = {'districts': elements}

    os.makedirs(CACHE_DIR, exist_ok=True)
    with open(cache_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False)
    print(f"    Сохранено в кэш: {cache_file}")

    return result


if __name__ == '__main__':
    print("=== Загрузка границ Москвы ===")
    msk = fetch_moscow_districts()
    print(f"  Округов: {len(msk.get('okrugs', []))}")
    print(f"  Районов: {len(msk.get('rayony', []))}")

    print("\n=== Загрузка границ СПб ===")
    spb = fetch_spb_districts()
    print(f"  Районов: {len(spb.get('districts', []))}")
