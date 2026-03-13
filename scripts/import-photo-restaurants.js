/**
 * Import restaurants that have valid (http) photos from pipeline.db into PostgreSQL.
 * Run: node scripts/import-photo-restaurants.js
 */
const Database = require('better-sqlite3');
const { Pool } = require('pg');
const path = require('path');

const PIPELINE_DB = path.join(__dirname, '..', 'restaurant_pipeline', 'data', 'processed', 'pipeline.db');

async function run() {
  const db = new Database(PIPELINE_DB, { readonly: true });
  const pg = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'menurest',
    user: process.env.DB_USER || 'menurest',
    password: process.env.DB_PASSWORD || 'menurest_dev_pass',
    max: 5,
  });

  // Get restaurant IDs with valid photos
  const photoRestIds = db.prepare(
    "SELECT DISTINCT r.id FROM photos p JOIN restaurants r ON r.id = p.restaurant_id AND r.is_duplicate = 0 WHERE p.url LIKE 'http%'"
  ).all().map(r => r.id);
  const idList = photoRestIds.join(',');
  console.log(`Restaurants with valid photos: ${photoRestIds.length}`);

  // 1. Cities
  const cityIds = [...new Set(
    db.prepare(`SELECT DISTINCT city_id FROM restaurants WHERE id IN (${idList})`).all().map(r => r.city_id)
  )];
  const cities = db.prepare(`SELECT * FROM cities WHERE id IN (${cityIds.join(',')})`).all();
  let n = 0;
  for (const c of cities) {
    try {
      await pg.query('INSERT INTO cities (name, slug) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING', [c.name, c.slug]);
      n++;
    } catch (e) { /* skip */ }
  }
  console.log(`Cities: ${n}`);

  // 2. Cuisines
  const cuisineIds = [...new Set(
    db.prepare(`SELECT DISTINCT cuisine_id FROM restaurant_cuisines WHERE restaurant_id IN (${idList})`).all().map(r => r.cuisine_id)
  )];
  if (cuisineIds.length > 0) {
    const cuisines = db.prepare(`SELECT * FROM cuisines WHERE id IN (${cuisineIds.join(',')})`).all();
    n = 0;
    for (const c of cuisines) {
      try {
        await pg.query('INSERT INTO cuisines (name, slug) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING', [c.name, c.slug]);
        n++;
      } catch (e) { /* skip */ }
    }
    console.log(`Cuisines: ${n}`);
  }

  // 3. Restaurants
  const restaurants = db.prepare(
    `SELECT r.*, c.slug as city_slug FROM restaurants r LEFT JOIN cities c ON c.id = r.city_id WHERE r.id IN (${idList})`
  ).all();
  n = 0;
  for (const r of restaurants) {
    const priceLevel = r.price_range === '₽' ? 1 : r.price_range === '₽₽' ? 2 : r.price_range === '₽₽₽' ? 3 : r.price_range === '₽₽₽₽' ? 4 : 2;
    // Resolve city_id first (NOT NULL constraint)
    let cityId = null;
    if (r.city_slug) {
      const cityRes = await pg.query('SELECT id FROM cities WHERE slug = $1', [r.city_slug]);
      cityId = cityRes.rows[0]?.id || null;
    }
    if (!cityId) {
      // city_id is NOT NULL, get any city as fallback
      const fallback = await pg.query('SELECT id FROM cities LIMIT 1');
      cityId = fallback.rows[0]?.id;
    }
    try {
      await pg.query(
        `INSERT INTO restaurants (name, slug, address, phone, website, description, price_level, rating, review_count, status, city_id, lat, lng)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'published', $10, $11, $12)
         ON CONFLICT (slug) DO NOTHING`,
        [r.name, r.slug, r.address, r.phone, r.website, r.description, priceLevel, r.rating || 0, r.review_count || 0, cityId, r.lat || null, r.lng || null]
      );
      n++;
    } catch (e) { console.error('  REST ERR:', r.slug, e.message.substring(0, 100)); }
  }
  console.log(`Restaurants: ${n}`);

  // 4. City links
  n = 0;
  for (const r of restaurants) {
    if (!r.city_slug) continue;
    try {
      await pg.query(
        `UPDATE restaurants SET city_id = (SELECT id FROM cities WHERE slug = $1) WHERE slug = $2`,
        [r.city_slug, r.slug]
      );
      n++;
    } catch (e) { /* skip */ }
  }
  console.log(`City links: ${n}`);

  // 5. Restaurant-Cuisine links
  const rcLinks = db.prepare(
    `SELECT r.slug as r_slug, cu.slug as c_slug FROM restaurant_cuisines rc
     JOIN restaurants r ON r.id = rc.restaurant_id
     JOIN cuisines cu ON cu.id = rc.cuisine_id
     WHERE rc.restaurant_id IN (${idList})`
  ).all();
  n = 0;
  for (const rc of rcLinks) {
    try {
      await pg.query(
        `INSERT INTO restaurant_cuisines (restaurant_id, cuisine_id)
         SELECT r.id, c.id FROM restaurants r, cuisines c WHERE r.slug = $1 AND c.slug = $2
         ON CONFLICT DO NOTHING`,
        [rc.r_slug, rc.c_slug]
      );
      n++;
    } catch (e) { /* skip */ }
  }
  console.log(`Cuisine links: ${n}`);

  // 6. Photos (only valid http URLs)
  const photos = db.prepare(
    `SELECT p.*, r.slug as r_slug FROM photos p
     JOIN restaurants r ON r.id = p.restaurant_id
     WHERE p.restaurant_id IN (${idList}) AND p.url LIKE 'http%'`
  ).all();
  n = 0;
  for (const p of photos) {
    try {
      const res = await pg.query(
        `INSERT INTO photos (restaurant_id, url, alt_text, is_cover, sort_order, source)
         SELECT r.id, $2, $3, $4, 0, $5 FROM restaurants r WHERE r.slug = $1`,
        [p.r_slug, p.url, p.caption || null, p.is_primary ? true : false, p.source || 'restoclub']
      );
      if (res.rowCount > 0) n++;
    } catch (e) { /* skip */ }
  }
  console.log(`Photos: ${n}`);

  // 7. Working hours
  const wh = db.prepare(
    `SELECT w.*, r.slug as r_slug FROM working_hours w
     JOIN restaurants r ON r.id = w.restaurant_id
     WHERE w.restaurant_id IN (${idList})`
  ).all();
  n = 0;
  for (const w of wh) {
    try {
      const res = await pg.query(
        `INSERT INTO working_hours (restaurant_id, day_of_week, open_time, close_time, is_closed)
         SELECT r.id, $2, $3, $4, $5 FROM restaurants r WHERE r.slug = $1
         ON CONFLICT DO NOTHING`,
        [w.r_slug, w.day_of_week, w.open_time, w.close_time, w.is_closed ? true : false]
      );
      if (res.rowCount > 0) n++;
    } catch (e) { /* skip */ }
  }
  console.log(`Working hours: ${n}`);

  // Summary
  const totalR = await pg.query('SELECT COUNT(*) as c FROM restaurants');
  const totalP = await pg.query('SELECT COUNT(*) as c FROM photos');
  const withCover = await pg.query('SELECT COUNT(DISTINCT restaurant_id) as c FROM photos WHERE is_cover = true');
  console.log('\n=== ИТОГО в PostgreSQL ===');
  console.log(`Рестораны: ${totalR.rows[0].c}`);
  console.log(`Фото: ${totalP.rows[0].c}`);
  console.log(`Рестораны с обложкой: ${withCover.rows[0].c}`);

  db.close();
  await pg.end();
}

run().catch(e => { console.error(e); process.exit(1); });
