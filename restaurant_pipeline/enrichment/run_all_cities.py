"""
Run yandex hours + photos for all remaining cities, one by one.
After each city: import closed restaurants to PG, import photos to PG.

Usage: cd restaurant_pipeline && python -m enrichment.run_all_cities
"""
import sys
import os
import sqlite3
import subprocess
import time
from pathlib import Path

os.environ['PYTHONUNBUFFERED'] = '1'
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from config.settings import PIPELINE_DB, PROCESSED_DIR

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent / 'backend'


def get_remaining_cities():
    """Get cities that still have unchecked restaurants, sorted by count DESC."""
    conn = sqlite3.connect(str(PIPELINE_DB), timeout=300)
    conn.execute("PRAGMA busy_timeout=300000")
    rows = conn.execute("""
        SELECT city, COUNT(*) as total,
            SUM(CASE WHEN yandex_checked_at IS NOT NULL THEN 1 ELSE 0 END) as checked
        FROM restaurants
        WHERE is_duplicate = 0 AND lat IS NOT NULL AND city IS NOT NULL
        GROUP BY city
        HAVING checked < total
        ORDER BY total DESC
    """).fetchall()
    conn.close()
    return [(r[0], r[1], r[2]) for r in rows]


def run_hours(city):
    print(f"\n{'='*60}")
    print(f"  ЧАСЫ РАБОТЫ: {city}")
    print(f"{'='*60}")
    result = subprocess.run(
        [sys.executable, '-m', 'enrichment.yandex_hours', '--city', city],
        cwd=str(Path(__file__).resolve().parent.parent),
    )
    return result.returncode == 0


def run_photos(city):
    print(f"\n{'='*60}")
    print(f"  ФОТО: {city}")
    print(f"{'='*60}")
    result = subprocess.run(
        [sys.executable, '-m', 'enrichment.yandex_photos', '--city', city],
        cwd=str(Path(__file__).resolve().parent.parent),
    )
    return result.returncode == 0


def close_restaurants_pg():
    """Run the node script to close restaurants in PG."""
    print("\n  Обновление закрытых ресторанов в PostgreSQL...")
    try:
        return _close_restaurants_pg_inner()
    except Exception as e:
        print(f"  ⚠️ Ошибка обновления закрытых: {e}")
        return False

def _close_restaurants_pg_inner():
    script = """
const Database = require('better-sqlite3');
const { DataSource } = require('typeorm');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const PIPELINE_DB = path.resolve(__dirname, '../restaurant_pipeline/data/processed/pipeline.db');
const pgDS = new DataSource({ type: 'postgres', host: process.env.DB_HOST||'localhost', port: +process.env.DB_PORT||5432, database: process.env.DB_NAME||'menurest', username: process.env.DB_USER||'menurest', password: process.env.DB_PASSWORD, synchronize: false, entities: [] });
async function run() {
  await pgDS.initialize();
  const sqlite = new Database(PIPELINE_DB, { readonly: true });
  const closed = sqlite.prepare("SELECT id, name, city, slug, legacy_id FROM restaurants WHERE yandex_closed = 1").all();
  const pgRests = await pgDS.query("SELECT r.id, r.name, r.legacy_id, r.slug, c.name as city_name FROM restaurants r LEFT JOIN cities c ON c.id = r.city_id WHERE r.status = 'published'");
  const pgBySlug = new Map(pgRests.map(r => [r.slug, r]));
  const pgByLegacyId = new Map();
  const pgByNameCity = new Map();
  for (const r of pgRests) {
    if (r.legacy_id) pgByLegacyId.set(r.legacy_id, r);
    const key = (r.name||'').toLowerCase().trim() + '|||' + (r.city_name||'').toLowerCase().trim();
    if (!pgByNameCity.has(key)) pgByNameCity.set(key, r);
  }
  sqlite.close();
  const toClose = new Set();
  for (const c of closed) {
    let pg = pgBySlug.get(c.slug);
    if (!pg && c.legacy_id) pg = pgByLegacyId.get(c.legacy_id);
    if (!pg) { const key = (c.name||'').toLowerCase().trim() + '|||' + (c.city||'').toLowerCase().trim(); pg = pgByNameCity.get(key); }
    if (pg) toClose.add(pg.id);
  }
  const ids = [...toClose];
  let updated = 0;
  for (let i = 0; i < ids.length; i += 1000) {
    const batch = ids.slice(i, i + 1000);
    const result = await pgDS.query("UPDATE restaurants SET status = 'closed' WHERE id = ANY($1) AND status = 'published'", [batch]);
    updated += result[1] || 0;
  }
  console.log('Closed: ' + updated);
  const pub = await pgDS.query("SELECT COUNT(*) as c FROM restaurants WHERE status = 'published'");
  console.log('Published: ' + pub[0].c);
  await pgDS.destroy();
}
run().catch(e => { console.error(e); process.exit(1); });
"""
    result = subprocess.run(
        ['node', '-e', script],
        cwd=str(BACKEND_DIR),
        timeout=300,
    )
    return result.returncode == 0


def import_photos_pg():
    """Run the ts script to import yandex photos to PG."""
    print("\n  Импорт фото в PostgreSQL...")
    # Use node with ts-node/register to avoid npx PATH issues on Windows
    npx = 'npx.cmd' if sys.platform == 'win32' else 'npx'
    try:
        result = subprocess.run(
            [npx, 'ts-node', 'scripts/import-yandex-photos.ts'],
            cwd=str(BACKEND_DIR),
            timeout=600,
        )
        return result.returncode == 0
    except Exception as e:
        print(f"  ⚠️ Импорт фото не удался: {e}")
        return False


def main():
    print("\n" + "=" * 60)
    print("  АВТОМАТИЧЕСКАЯ ОБРАБОТКА ВСЕХ ГОРОДОВ")
    print("=" * 60)

    cities = get_remaining_cities()
    print(f"\nГородов к обработке: {len(cities)}")
    for city, total, checked in cities[:20]:
        print(f"  {city}: {checked}/{total} ({checked*100//total if total else 0}%)")
    if len(cities) > 20:
        print(f"  ... и ещё {len(cities) - 20}")

    start = time.time()

    for i, (city, total, checked) in enumerate(cities):
        remaining = total - checked
        if remaining <= 0:
            continue

        print(f"\n\n{'#'*60}")
        print(f"  [{i+1}/{len(cities)}] {city} — {remaining} ресторанов")
        print(f"{'#'*60}")

        # Step 1: Hours
        run_hours(city)

        # Step 2: Photos
        run_photos(city)

        # Step 3: Close restaurants + import photos to PG (every 3 cities)
        if (i + 1) % 3 == 0 or i == len(cities) - 1:
            close_restaurants_pg()
            import_photos_pg()

    # Final PG update
    print("\n\nФинальное обновление PG...")
    close_restaurants_pg()
    import_photos_pg()

    elapsed = time.time() - start
    print(f"\n{'='*60}")
    print(f"  ВСЁ ГОТОВО! Время: {elapsed/3600:.1f} часов")
    print(f"{'='*60}")


if __name__ == '__main__':
    main()
