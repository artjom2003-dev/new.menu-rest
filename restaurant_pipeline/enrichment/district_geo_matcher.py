"""
Геопривязка ресторанов к районам через point-in-polygon.

Скачивает границы административных районов Москвы и СПб из OSM (Overpass),
затем определяет район каждого ресторана по его координатам.

Использование:
    python -m enrichment.district_geo_matcher
    python main.py --step districts-geo
"""
import sys
import os
import json
import time

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import requests
from shapely.geometry import Point, Polygon, MultiPolygon, shape
from shapely.ops import unary_union

from utils.db import get_connection, log_import

# Overpass API endpoints (rotate on failure)
OVERPASS_ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
]

# Moscow: relation 2555133 -> area 3602555133
# SPb: relation 337422 -> area 3600337422
CITIES = [
    {
        'name': 'Москва',
        'city_id': None,  # will be resolved from DB
        'area_id': 3602555133,
        'admin_level': '5',  # округа (ЦАО, САО...)
        'admin_level_detail': '8',  # районы (Тверской, Арбат...)
    },
    {
        'name': 'Санкт-Петербург',
        'city_id': None,
        'area_id': 3600337422,
        'admin_level': '5',  # районы СПб
        'admin_level_detail': None,
    },
]


def _overpass_query(query: str, timeout: int = 180) -> dict:
    """Execute Overpass query with endpoint rotation."""
    for endpoint in OVERPASS_ENDPOINTS:
        try:
            resp = requests.post(
                endpoint,
                data={'data': query},
                timeout=timeout,
                headers={'User-Agent': 'MenuRest-Pipeline/1.0'}
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            print(f"    [!] {endpoint.split('//')[1].split('/')[0]} -> {type(e).__name__}: {e}")
            time.sleep(2)
            continue
    raise RuntimeError("All Overpass endpoints failed")


def _build_polygons(data: dict) -> list[dict]:
    """
    Parse Overpass relation response with geometry into polygons.
    Returns list of {name, polygon} dicts.
    """
    results = []

    for element in data.get('elements', []):
        if element.get('type') != 'relation':
            continue

        name = element.get('tags', {}).get('name', '')
        if not name:
            continue

        # Collect outer way geometries (including role="" which defaults to outer)
        outer_segments = []
        for member in element.get('members', []):
            if member.get('role') not in ('outer', ''):
                continue
            geom = member.get('geometry', [])
            if not geom:
                continue
            coords = [(p['lon'], p['lat']) for p in geom]
            if len(coords) >= 2:
                outer_segments.append(coords)

        if not outer_segments:
            continue

        # Assemble segments into closed rings
        rings = _assemble_rings(outer_segments)

        if not rings:
            continue

        # Build polygons from rings
        polygons = []
        for ring in rings:
            try:
                p = Polygon(ring)
                if not p.is_valid:
                    p = p.buffer(0)  # fix self-intersections
                if p.is_valid and p.area > 0:
                    polygons.append(p)
            except Exception:
                pass

        if polygons:
            if len(polygons) == 1:
                results.append({'name': name, 'polygon': polygons[0]})
            else:
                try:
                    mp = unary_union(polygons)
                    results.append({'name': name, 'polygon': mp})
                except Exception:
                    results.append({'name': name, 'polygon': polygons[0]})

    return results


def _assemble_rings(segments: list[list]) -> list[list]:
    """
    Assemble open way segments into closed rings using endpoint matching.
    Uses an endpoint index for O(n) matching instead of O(n²).
    """
    if not segments:
        return []

    EPS = 1e-6

    def _key(point):
        """Round coordinates to create a hashable key for endpoint matching."""
        return (round(point[0] / EPS) * EPS, round(point[1] / EPS) * EPS)

    # First check for already-closed segments
    results = []
    open_segs = []
    for seg in segments:
        if len(seg) >= 4 and _pts_eq(seg[0], seg[-1]):
            results.append(seg)
        else:
            open_segs.append(list(seg))

    if not open_segs:
        return results

    # Build endpoint index: key -> list of (seg_index, 'start'|'end')
    endpoint_idx = {}
    active = set(range(len(open_segs)))

    def _add_to_index(idx):
        seg = open_segs[idx]
        sk = _key(seg[0])
        ek = _key(seg[-1])
        endpoint_idx.setdefault(sk, []).append((idx, 'start'))
        endpoint_idx.setdefault(ek, []).append((idx, 'end'))

    def _remove_from_index(idx):
        seg = open_segs[idx]
        sk = _key(seg[0])
        ek = _key(seg[-1])
        if sk in endpoint_idx:
            endpoint_idx[sk] = [(i, e) for i, e in endpoint_idx[sk] if i != idx]
            if not endpoint_idx[sk]:
                del endpoint_idx[sk]
        if ek in endpoint_idx:
            endpoint_idx[ek] = [(i, e) for i, e in endpoint_idx[ek] if i != idx]
            if not endpoint_idx[ek]:
                del endpoint_idx[ek]

    for i in active:
        _add_to_index(i)

    while active:
        # Start a new chain from any active segment
        start_idx = min(active)
        active.discard(start_idx)
        _remove_from_index(start_idx)
        chain = open_segs[start_idx]

        # Keep extending the chain
        changed = True
        while changed:
            changed = False

            # Try to extend from chain end
            end_key = _key(chain[-1])
            candidates = endpoint_idx.get(end_key, [])
            for cand_idx, cand_end in candidates:
                if cand_idx not in active:
                    continue
                active.discard(cand_idx)
                _remove_from_index(cand_idx)
                cand_seg = open_segs[cand_idx]
                if cand_end == 'start':
                    # chain end matches cand start -> append
                    chain.extend(cand_seg[1:])
                else:
                    # chain end matches cand end -> append reversed
                    chain.extend(reversed(cand_seg[:-1]))
                changed = True
                break

            if changed:
                continue

            # Try to extend from chain start
            start_key = _key(chain[0])
            candidates = endpoint_idx.get(start_key, [])
            for cand_idx, cand_end in candidates:
                if cand_idx not in active:
                    continue
                active.discard(cand_idx)
                _remove_from_index(cand_idx)
                cand_seg = open_segs[cand_idx]
                if cand_end == 'end':
                    # cand end matches chain start -> prepend
                    chain = cand_seg + chain[1:]
                else:
                    # cand start matches chain start -> prepend reversed
                    chain = list(reversed(cand_seg)) + chain[1:]
                changed = True
                break

        # Check if chain is closed
        if len(chain) >= 4 and _pts_eq(chain[0], chain[-1]):
            chain[-1] = chain[0]  # exact close
            results.append(chain)

    return results


def _pts_eq(a, b, eps=1e-6):
    return abs(a[0] - b[0]) < eps and abs(a[1] - b[1]) < eps


def _load_boundaries_from_cache(city_name: str) -> list[dict]:
    """Load district boundaries from cached JSON files (fetched by fetch_boundaries.py)."""
    cache_dir = os.path.join(os.path.dirname(__file__), '..', 'data', 'processed')

    if 'Москва' in city_name or 'москв' in city_name.lower():
        cache_file = os.path.join(cache_dir, 'boundaries_moscow.json')
        if not os.path.exists(cache_file):
            print(f"    [!] Кэш не найден: {cache_file}")
            print(f"    Запустите сначала: python -m enrichment.fetch_boundaries")
            return []
        with open(cache_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        # Prefer rayony (admin_level=8) over okrugs (admin_level=5)
        elements = data.get('rayony', []) or data.get('okrugs', [])
        print(f"    Загружено из кэша: {len(elements)} элементов")
        return _build_polygons({'elements': elements})

    elif 'Петербург' in city_name or 'петерб' in city_name.lower():
        cache_file = os.path.join(cache_dir, 'boundaries_spb.json')
        if not os.path.exists(cache_file):
            print(f"    [!] Кэш не найден: {cache_file}")
            print(f"    Запустите сначала: python -m enrichment.fetch_boundaries")
            return []
        with open(cache_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        elements = data.get('districts', [])
        print(f"    Загружено из кэша: {len(elements)} элементов")
        return _build_polygons({'elements': elements})

    return []


def _fetch_district_boundaries(city_config: dict) -> list[dict]:
    """Load district boundary polygons from cache or Overpass."""
    name = city_config['name']
    print(f"\n  Загрузка границ: {name}...")

    # Try cache first
    districts = _load_boundaries_from_cache(name)
    if districts:
        for d in districts:
            area_km2 = d['polygon'].area * 111 * 111
            # Only print large enough districts
        print(f"    Построено полигонов: {len(districts)}")
        return districts

    # Fallback to Overpass
    area_id = city_config['area_id']
    admin_level = city_config['admin_level']

    query = f"""
    [out:json][timeout:300];
    area({area_id})->.city;
    rel(area.city)["admin_level"="{admin_level}"]["boundary"="administrative"];
    out body geom;
    """

    data = _overpass_query(query, timeout=300)
    districts = _build_polygons(data)
    print(f"    Получено полигонов из Overpass: {len(districts)}")

    # Also fetch detail level if configured (Moscow rayony)
    detail_level = city_config.get('admin_level_detail')
    if detail_level:
        query_detail = f"""
        [out:json][timeout:300];
        area({area_id})->.city;
        rel(area.city)["admin_level"="{detail_level}"]["boundary"="administrative"];
        out body geom;
        """
        try:
            data_detail = _overpass_query(query_detail, timeout=300)
            detail_districts = _build_polygons(data_detail)
            if detail_districts:
                return detail_districts
        except Exception:
            pass

    return districts


def _slugify(name: str) -> str:
    """Transliterate Russian name to slug."""
    table = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
        'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
        ' ': '-', '-': '-', '.': '', ',': '', '(': '', ')': '',
    }
    result = []
    for ch in name.lower():
        result.append(table.get(ch, ch))
    slug = ''.join(result)
    # Clean up
    while '--' in slug:
        slug = slug.replace('--', '-')
    return slug.strip('-')


def run_district_geo_matcher():
    """Main entry point: fetch boundaries and match restaurants."""
    print(f"\n{'=' * 60}")
    print("ГЕОПРИВЯЗКА РАЙОНОВ (point-in-polygon)")
    print(f"{'=' * 60}")

    conn = get_connection()
    log_import('district_geo_matcher', 'matching', 'started')

    total_matched = 0

    for city_config in CITIES:
        city_name = city_config['name']

        # Resolve city_id
        row = conn.execute(
            "SELECT id FROM cities WHERE name LIKE ?",
            (f'%{city_name}%',)
        ).fetchone()
        if not row:
            print(f"  [!] Город '{city_name}' не найден в БД, пропуск")
            continue
        city_id = row[0]
        city_config['city_id'] = city_id

        # Fetch boundaries from Overpass
        try:
            district_polygons = _fetch_district_boundaries(city_config)
        except Exception as e:
            print(f"  [!] Ошибка загрузки границ для {city_name}: {e}")
            continue

        if not district_polygons:
            print(f"  [!] Нет полигонов для {city_name}")
            continue

        # Ensure districts exist in DB
        for dp in district_polygons:
            slug = _slugify(dp['name'])
            existing = conn.execute(
                "SELECT id FROM districts WHERE slug = ?", (slug,)
            ).fetchone()
            if existing:
                dp['district_id'] = existing[0]
            else:
                conn.execute(
                    "INSERT INTO districts (name, slug, city_id) VALUES (?, ?, ?)",
                    (dp['name'], slug, city_id)
                )
                dp['district_id'] = conn.execute(
                    "SELECT last_insert_rowid()"
                ).fetchone()[0]

        conn.commit()

        # Get restaurants with coordinates
        restaurants = conn.execute("""
            SELECT id, lat, lng FROM restaurants
            WHERE city_id = ? AND is_duplicate = 0
              AND lat IS NOT NULL AND lng IS NOT NULL
        """, (city_id,)).fetchall()

        print(f"\n  Матчинг {len(restaurants)} ресторанов в {city_name}...")

        # Build spatial index (simple: iterate all polygons per point)
        matched = 0
        for rest in restaurants:
            rid = rest[0]
            lat = float(rest[1])
            lng = float(rest[2])
            point = Point(lng, lat)

            for dp in district_polygons:
                try:
                    if dp['polygon'].contains(point):
                        conn.execute(
                            "UPDATE restaurants SET district_id = ? WHERE id = ?",
                            (dp['district_id'], rid)
                        )
                        matched += 1
                        break
                except Exception:
                    continue

        conn.commit()

        print(f"    Привязано: {matched} / {len(restaurants)}")
        total_matched += matched

        # Stats per district
        print(f"\n    Распределение по районам ({city_name}):")
        dist_stats = conn.execute("""
            SELECT d.name, COUNT(r.id)
            FROM restaurants r
            JOIN districts d ON r.district_id = d.id
            WHERE r.city_id = ? AND r.is_duplicate = 0
            GROUP BY d.name
            ORDER BY COUNT(r.id) DESC
        """, (city_id,)).fetchall()
        for dname, cnt in dist_stats[:20]:
            print(f"      {dname}: {cnt}")
        if len(dist_stats) > 20:
            print(f"      ... и ещё {len(dist_stats) - 20} районов")

    log_import('district_geo_matcher', 'matching', 'completed', total_matched)

    # Overall stats
    total_with = conn.execute(
        "SELECT COUNT(*) FROM restaurants WHERE district_id IS NOT NULL AND is_duplicate = 0"
    ).fetchone()[0]
    total_all = conn.execute(
        "SELECT COUNT(*) FROM restaurants WHERE is_duplicate = 0"
    ).fetchone()[0]
    print(f"\n  ИТОГО: {total_with} / {total_all} ресторанов с районом ({total_with/total_all*100:.1f}%)")

    conn.close()
    return total_matched


if __name__ == '__main__':
    run_district_geo_matcher()
