import * as BetterSqlite3 from 'better-sqlite3';
import * as path from 'path';

const PIPELINE_DB = path.resolve(__dirname, '../../../../restaurant_pipeline/data/processed/pipeline.db');

const SqliteDB = (BetterSqlite3 as any).default || BetterSqlite3;
const db = new SqliteDB(PIPELINE_DB, { readonly: true });

const best = db.prepare(`
  SELECT r.id, r.name, r.slug, r.city, r.address, r.metro_station, r.phone, r.website,
    r.description, r.rating, r.review_count, r.has_wifi, r.has_delivery, r.lat, r.lng, r.features,
    (SELECT COUNT(*) FROM photos p WHERE p.restaurant_id = r.id) as photo_count,
    (SELECT COUNT(*) FROM dishes d WHERE d.restaurant_id = r.id) as dish_count
  FROM restaurants r
  WHERE r.description IS NOT NULL AND LENGTH(r.description) > 50
    AND r.city IN ('Москва', 'Санкт-Петербург')
  GROUP BY r.id
  HAVING photo_count > 0 AND dish_count > 0
  ORDER BY dish_count DESC, photo_count DESC
  LIMIT 30
`).all() as any[];

console.log('Restaurants with photos AND dishes:\n');
for (const r of best) {
  const cuisines = db.prepare(
    'SELECT c.name FROM restaurant_cuisines rc JOIN cuisines c ON c.id = rc.cuisine_id WHERE rc.restaurant_id = ?'
  ).all(r.id) as any[];
  console.log(`${r.id} | ${r.name} | ${r.city} | photos:${r.photo_count} dishes:${r.dish_count} | ${r.address} | cuisines: ${cuisines.map((c: any) => c.name).join(', ') || 'none'}`);
}

db.close();
