/**
 * scripts/import-pipeline.ts
 *
 * Импорт данных из pipeline.db (SQLite) в PostgreSQL.
 * Запуск:
 *   npx ts-node scripts/import-pipeline.ts
 *   npx ts-node scripts/import-pipeline.ts --dry-run
 *   npx ts-node scripts/import-pipeline.ts --step restaurants
 *
 * Шаги: cities → districts → chains → cuisines → restaurants →
 *        restaurant_cuisines → restaurant_features → restaurant_locations →
 *        working_hours → menu_categories → dishes → dish_allergens →
 *        photos → reviews → recalc_ratings
 */

import { Pool } from 'pg';
import Database = require('better-sqlite3');
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

// ─── Config ─────────────────────────────────────────────────────────────────

const BATCH_SIZE = 500;
const isDryRun = process.argv.includes('--dry-run');
const stepArg = process.argv.find(a => a.startsWith('--step='))?.split('=')[1];

const PIPELINE_DB_PATH = path.join(__dirname, '..', 'restaurant_pipeline', 'data', 'processed', 'pipeline.db');

// ─── Connections ────────────────────────────────────────────────────────────

function createPgPool(): Pool {
  return new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME     || 'menurest',
    user:     process.env.DB_USER     || 'menurest',
    password: process.env.DB_PASSWORD || '',
    max: 5,
  });
}

// ─── Utilities ──────────────────────────────────────────────────────────────

const translit: Record<string, string> = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'yo',ж:'zh',з:'z',и:'i',й:'y',
  к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',
  х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
};

function slugify(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .split('')
    .map(c => translit[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 190);
}

function log(step: string, msg: string) {
  console.log(`[${step}] ${msg}`);
}

function parsePriceLevel(priceRange: string | null, avgBill: number | null): number | null {
  if (priceRange) {
    const lower = priceRange.toLowerCase();
    if (lower.includes('дёшев') || lower.includes('дешев') || lower.includes('эконом')) return 1;
    if (lower.includes('средн')) return 2;
    if (lower.includes('дорог') || lower.includes('выше средн')) return 3;
    if (lower.includes('премиум') || lower.includes('люкс')) return 4;
  }
  if (avgBill) {
    if (avgBill < 100000) return 1;  // < 1000 руб (в копейках)
    if (avgBill < 200000) return 2;
    if (avgBill < 400000) return 3;
    return 4;
  }
  return null;
}

// ─── Import Steps ───────────────────────────────────────────────────────────

async function importCities(sqlite: Database.Database, pg: Pool) {
  const rows = sqlite.prepare(`SELECT * FROM cities ORDER BY id`).all() as Array<Record<string, unknown>>;
  log('cities', `Найдено ${rows.length} городов`);
  if (isDryRun) return;

  for (const row of rows) {
    const slug = (row.slug as string) || slugify(row.name as string);
    await pg.query(
      `INSERT INTO cities (name, slug, country, legacy_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (slug) DO NOTHING`,
      [row.name, slug, row.country || 'Россия', row.legacy_id || null]
    );
  }
  log('cities', `Импортировано ${rows.length} городов`);
}

async function importDistricts(sqlite: Database.Database, pg: Pool) {
  // Check if districts table exists in pipeline.db
  const tableExists = sqlite.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='districts'`
  ).get();
  if (!tableExists) {
    log('districts', 'Таблица districts отсутствует в pipeline.db, пропуск');
    return;
  }

  const rows = sqlite.prepare(`SELECT * FROM districts ORDER BY id`).all() as Array<Record<string, unknown>>;
  log('districts', `Найдено ${rows.length} районов`);
  if (isDryRun) return;

  let imported = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    for (const row of batch) {
      // Resolve city_id via slug lookup
      let cityId: number | null = null;
      if (row.city_id) {
        const citySlug = sqlite.prepare(`SELECT slug, name FROM cities WHERE id = ?`).get(row.city_id) as { slug: string; name: string } | undefined;
        if (citySlug) {
          const cityResult = await pg.query(
            `SELECT id FROM cities WHERE slug = $1 OR name = $2 LIMIT 1`,
            [citySlug.slug || slugify(citySlug.name), citySlug.name]
          );
          cityId = cityResult.rows[0]?.id || null;
        }
      }

      const slug = (row.slug as string) || slugify(row.name as string);
      try {
        await pg.query(
          `INSERT INTO districts (name, slug, city_id, legacy_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name`,
          [row.name, slug, cityId, row.id]
        );
        imported++;
      } catch { /* skip */ }
    }
  }
  log('districts', `Импортировано ${imported} районов`);
}

async function importChains(sqlite: Database.Database, pg: Pool) {
  const rows = sqlite.prepare(`SELECT * FROM restaurant_chains ORDER BY id`).all() as Array<Record<string, unknown>>;
  log('chains', `Найдено ${rows.length} сетей`);
  if (isDryRun) return;

  for (const row of rows) {
    const slug = (row.slug as string) || slugify(row.name as string);
    await pg.query(
      `INSERT INTO restaurant_chains (name, slug, legacy_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO NOTHING`,
      [row.name, slug, row.legacy_id || null]
    );
  }
  log('chains', `Импортировано ${rows.length} сетей`);
}

async function importCuisines(sqlite: Database.Database, pg: Pool) {
  const rows = sqlite.prepare(`SELECT * FROM cuisines ORDER BY id`).all() as Array<Record<string, unknown>>;
  log('cuisines', `Найдено ${rows.length} кухонь`);
  if (isDryRun) return;

  for (const row of rows) {
    const slug = (row.slug as string) || slugify(row.name as string);
    await pg.query(
      `INSERT INTO cuisines (name, slug, legacy_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO NOTHING`,
      [row.name, slug, row.legacy_id || null]
    );
  }
  log('cuisines', `Импортировано ${rows.length} кухонь`);
}

async function importRestaurants(sqlite: Database.Database, pg: Pool) {
  const rows = sqlite.prepare(
    `SELECT * FROM restaurants WHERE is_duplicate = 0 AND merged_into_id IS NULL ORDER BY id`
  ).all() as Array<Record<string, unknown>>;
  log('restaurants', `Найдено ${rows.length} ресторанов (без дублей)`);
  if (isDryRun) return;

  let imported = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    for (const row of batch) {
      // Получаем city_id по имени города
      let cityId: number | null = null;
      if (row.city) {
        const cityResult = await pg.query(
          `SELECT id FROM cities WHERE slug = $1 OR name = $2 LIMIT 1`,
          [slugify(row.city as string), row.city]
        );
        cityId = cityResult.rows[0]?.id || null;
      }

      // Получаем chain_id
      let chainId: number | null = null;
      if (row.chain_id) {
        const chainSlug = sqlite.prepare(`SELECT slug FROM restaurant_chains WHERE id = ?`).get(row.chain_id) as { slug: string } | undefined;
        if (chainSlug) {
          const chainResult = await pg.query(`SELECT id FROM restaurant_chains WHERE slug = $1`, [chainSlug.slug]);
          chainId = chainResult.rows[0]?.id || null;
        }
      }

      const slug = (row.slug as string) || slugify(row.name as string);
      const avgBill = row.average_bill ? Number(row.average_bill) : null;
      const priceLevel = parsePriceLevel(row.price_range as string | null, avgBill);

      // Статус: pipeline 'active' → PG 'published'
      const statusMap: Record<string, string> = { active: 'published', closed: 'archived', unknown: 'draft' };
      const status = statusMap[(row.status as string) || 'active'] || 'draft';

      try {
        await pg.query(
          `INSERT INTO restaurants (
            name, slug, description, city_id, chain_id,
            address, metro_station, lat, lng, phone, website,
            price_level, average_bill, has_wifi, has_delivery,
            rating, review_count, status, legacy_id, external_2gis_id
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
          ON CONFLICT (slug) DO UPDATE SET
            description = COALESCE(EXCLUDED.description, restaurants.description),
            address = COALESCE(EXCLUDED.address, restaurants.address),
            phone = COALESCE(EXCLUDED.phone, restaurants.phone),
            rating = GREATEST(EXCLUDED.rating, restaurants.rating),
            updated_at = NOW()`,
          [
            row.name, slug, row.description || null,
            cityId, chainId,
            row.address || null, row.metro_station || null,
            row.lat || null, row.lng || null,
            row.phone || null, row.website || null,
            priceLevel, avgBill,
            row.has_wifi ? true : false, row.has_delivery ? true : false,
            row.rating || 0, row.review_count || 0,
            status,
            row.legacy_id || null, row.external_2gis_id || null,
          ]
        );
        imported++;
      } catch (err) {
        // Дубликат slug — добавляем суффикс
        const altSlug = `${slug}-${row.id}`;
        try {
          await pg.query(
            `INSERT INTO restaurants (name, slug, description, city_id, address, lat, lng, phone, rating, review_count, status, legacy_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
             ON CONFLICT (slug) DO NOTHING`,
            [row.name, altSlug, row.description, cityId, row.address, row.lat, row.lng, row.phone, row.rating || 0, row.review_count || 0, status, row.legacy_id]
          );
          imported++;
        } catch { /* skip */ }
      }
    }

    log('restaurants', `Прогресс: ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
  }
  log('restaurants', `Импортировано ${imported} ресторанов`);
}

async function importRestaurantCuisines(sqlite: Database.Database, pg: Pool) {
  const rows = sqlite.prepare(
    `SELECT rc.restaurant_id, rc.cuisine_id, r.slug AS r_slug, c.slug AS c_slug
     FROM restaurant_cuisines rc
     JOIN restaurants r ON r.id = rc.restaurant_id AND r.is_duplicate = 0
     JOIN cuisines c ON c.id = rc.cuisine_id`
  ).all() as Array<Record<string, unknown>>;
  log('restaurant_cuisines', `Найдено ${rows.length} связей`);
  if (isDryRun) return;

  let imported = 0;
  for (const row of rows) {
    try {
      await pg.query(
        `INSERT INTO restaurant_cuisines (restaurant_id, cuisine_id)
         SELECT r.id, c.id FROM restaurants r, cuisines c
         WHERE r.slug = $1 AND c.slug = $2
         ON CONFLICT DO NOTHING`,
        [row.r_slug, row.c_slug]
      );
      imported++;
    } catch { /* skip */ }
  }
  log('restaurant_cuisines', `Импортировано ${imported} связей`);
}

async function importRestaurantFeatures(sqlite: Database.Database, pg: Pool) {
  // Рестораны с features JSON в pipeline.db → restaurant_features M2M в PG
  const rows = sqlite.prepare(
    `SELECT r.slug, r.features FROM restaurants r
     WHERE r.is_duplicate = 0 AND r.features IS NOT NULL AND r.features != '[]'`
  ).all() as Array<Record<string, unknown>>;
  log('restaurant_features', `Найдено ${rows.length} ресторанов с фичами`);
  if (isDryRun) return;

  // Кеш feature slug → id
  const featureCache: Record<string, number> = {};
  const featureRows = await pg.query(`SELECT id, slug FROM features`);
  for (const fr of featureRows.rows) {
    featureCache[fr.slug] = fr.id;
  }

  let imported = 0;
  for (const row of rows) {
    let features: string[];
    try {
      features = JSON.parse(row.features as string);
      if (!Array.isArray(features)) continue;
    } catch { continue; }

    for (const featureSlug of features) {
      const featureId = featureCache[featureSlug];
      if (!featureId) continue;

      try {
        await pg.query(
          `INSERT INTO restaurant_features (restaurant_id, feature_id)
           SELECT r.id, $2 FROM restaurants r WHERE r.slug = $1
           ON CONFLICT DO NOTHING`,
          [row.slug, featureId]
        );
        imported++;
      } catch { /* skip */ }
    }
  }
  log('restaurant_features', `Импортировано ${imported} связей`);
}

async function importWorkingHours(sqlite: Database.Database, pg: Pool) {
  const rows = sqlite.prepare(
    `SELECT wh.*, r.slug AS r_slug FROM working_hours wh
     JOIN restaurants r ON r.id = wh.restaurant_id AND r.is_duplicate = 0`
  ).all() as Array<Record<string, unknown>>;
  log('working_hours', `Найдено ${rows.length} записей`);
  if (isDryRun) return;

  let imported = 0;
  for (const row of rows) {
    try {
      await pg.query(
        `INSERT INTO working_hours (restaurant_id, day_of_week, open_time, close_time, is_closed)
         SELECT r.id, $2, $3, $4, $5 FROM restaurants r WHERE r.slug = $1
         ON CONFLICT DO NOTHING`,
        [row.r_slug, row.day_of_week, row.open_time || null, row.close_time || null, row.is_closed ? true : false]
      );
      imported++;
    } catch { /* skip */ }
  }
  log('working_hours', `Импортировано ${imported} записей`);
}

async function importRestaurantLocations(sqlite: Database.Database, pg: Pool) {
  // Check if district_id column exists on restaurants in pipeline.db
  let hasDistrictId = false;
  try {
    sqlite.prepare(`SELECT district_id FROM restaurants LIMIT 1`).get();
    hasDistrictId = true;
  } catch { /* column doesn't exist yet */ }

  const query = hasDistrictId
    ? `SELECT id, slug, city, city_id, district_id, address, lat, lng, metro_station, phone
       FROM restaurants WHERE is_duplicate = 0 AND merged_into_id IS NULL
       AND address IS NOT NULL AND address != ''`
    : `SELECT id, slug, city, city_id, address, lat, lng, metro_station, phone
       FROM restaurants WHERE is_duplicate = 0 AND merged_into_id IS NULL
       AND address IS NOT NULL AND address != ''`;

  const rows = sqlite.prepare(query).all() as Array<Record<string, unknown>>;
  log('restaurant_locations', `Найдено ${rows.length} ресторанов с адресами`);
  if (isDryRun) return;

  let imported = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    for (const row of batch) {
      const slug = row.slug as string;

      // Resolve city_id
      let cityId: number | null = null;
      if (row.city) {
        const cityResult = await pg.query(
          `SELECT id FROM cities WHERE slug = $1 OR name = $2 LIMIT 1`,
          [slugify(row.city as string), row.city]
        );
        cityId = cityResult.rows[0]?.id || null;
      }

      // Resolve district_id if available
      let districtId: number | null = null;
      if (hasDistrictId && row.district_id) {
        const districtLegacy = row.district_id;
        const districtResult = await pg.query(
          `SELECT id FROM districts WHERE legacy_id = $1 LIMIT 1`,
          [districtLegacy]
        );
        districtId = districtResult.rows[0]?.id || null;
      }

      try {
        await pg.query(
          `INSERT INTO restaurant_locations (restaurant_id, city_id, district_id, address, lat, lng, metro_station, phone, is_primary)
           SELECT r.id, $2, $3, $4, $5, $6, $7, $8, true
           FROM restaurants r WHERE r.slug = $1
           ON CONFLICT DO NOTHING`,
          [
            slug, cityId, districtId,
            row.address || null, row.lat || null, row.lng || null,
            row.metro_station || null, row.phone || null,
          ]
        );
        imported++;
      } catch { /* skip */ }
    }

    if (i % 2000 === 0) log('restaurant_locations', `Прогресс: ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
  }
  log('restaurant_locations', `Импортировано ${imported} локаций`);
}

async function importMenuCategories(sqlite: Database.Database, pg: Pool) {
  // Get distinct category names per restaurant from pipeline.db dishes
  const rows = sqlite.prepare(
    `SELECT DISTINCT d.category, r.slug AS r_slug
     FROM dishes d
     JOIN restaurants r ON r.id = d.restaurant_id AND r.is_duplicate = 0
     WHERE d.category IS NOT NULL AND d.category != ''
     ORDER BY r.slug, d.category`
  ).all() as Array<Record<string, unknown>>;
  log('menu_categories', `Найдено ${rows.length} уникальных категорий`);
  if (isDryRun) return;

  let imported = 0;
  // Group by restaurant slug for sort_order
  let currentSlug = '';
  let sortOrder = 0;

  for (const row of rows) {
    if (row.r_slug !== currentSlug) {
      currentSlug = row.r_slug as string;
      sortOrder = 0;
    }

    try {
      await pg.query(
        `INSERT INTO menu_categories (restaurant_id, name, slug, sort_order)
         SELECT r.id, $2, $3, $4 FROM restaurants r WHERE r.slug = $1
         ON CONFLICT DO NOTHING`,
        [row.r_slug, row.category, slugify(row.category as string), sortOrder]
      );
      imported++;
      sortOrder++;
    } catch { /* skip */ }
  }
  log('menu_categories', `Импортировано ${imported} категорий меню`);
}

async function importDishes(sqlite: Database.Database, pg: Pool) {
  const rows = sqlite.prepare(
    `SELECT d.*, r.slug AS r_slug FROM dishes d
     JOIN restaurants r ON r.id = d.restaurant_id AND r.is_duplicate = 0
     WHERE d.name IS NOT NULL AND d.name != ''`
  ).all() as Array<Record<string, unknown>>;
  log('dishes', `Найдено ${rows.length} блюд`);
  if (isDryRun) return;

  let imported = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    for (const row of batch) {
      try {
        // Создаём dish
        const dishResult = await pg.query(
          `INSERT INTO dishes (name, description, composition, calories, protein, fat, carbs, image_url, is_healthy_choice, legacy_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING id`,
          [
            row.name, row.description || null, row.composition || null,
            row.calories || null, row.protein || null, row.fat || null, row.carbs || null,
            row.photo_url || null,
            row.is_healthy_choice ? true : false,
            row.legacy_id || null,
          ]
        );
        const dishId = dishResult.rows[0].id;

        // Привязываем к ресторану через restaurant_dishes
        const price = row.price ? Math.round(Number(row.price) * 100) : 0; // руб → копейки
        const categorySlug = row.category ? slugify(row.category as string) : null;
        await pg.query(
          `INSERT INTO restaurant_dishes (restaurant_id, dish_id, category_name, menu_category_id, price, is_available)
           SELECT r.id, $2, $3,
             (SELECT mc.id FROM menu_categories mc WHERE mc.restaurant_id = r.id AND mc.slug = $6 LIMIT 1),
             $4, $5
           FROM restaurants r WHERE r.slug = $1`,
          [row.r_slug, dishId, row.category || null, price, row.is_available !== 0, categorySlug]
        );
        imported++;
      } catch { /* skip duplicates */ }
    }

    if (i % 2000 === 0) log('dishes', `Прогресс: ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
  }
  log('dishes', `Импортировано ${imported} блюд`);
}

async function importDishAllergens(sqlite: Database.Database, pg: Pool) {
  // Проверяем наличие таблицы dish_allergens в SQLite
  const tableExists = sqlite.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='dish_allergens'`
  ).get();
  if (!tableExists) {
    log('dish_allergens', 'Таблица dish_allergens отсутствует в pipeline.db, пропуск');
    return;
  }

  const rows = sqlite.prepare(
    `SELECT da.dish_id, da.allergen_slug, da.severity, d.legacy_id AS dish_legacy_id
     FROM dish_allergens da
     JOIN dishes d ON d.id = da.dish_id`
  ).all() as Array<Record<string, unknown>>;
  log('dish_allergens', `Найдено ${rows.length} связей`);
  if (isDryRun) return;

  // Кеш allergen slug → id
  const allergenCache: Record<string, number> = {};
  const allergenRows = await pg.query(`SELECT id, slug FROM allergens`);
  for (const ar of allergenRows.rows) {
    allergenCache[ar.slug] = ar.id;
  }

  // Создаём таблицу если не существует
  await pg.query(`
    CREATE TABLE IF NOT EXISTS "dish_allergens" (
      "dish_id" int NOT NULL REFERENCES "dishes"("id") ON DELETE CASCADE,
      "allergen_id" int NOT NULL REFERENCES "allergens"("id") ON DELETE CASCADE,
      "severity" varchar(20) NOT NULL DEFAULT 'may_contain',
      PRIMARY KEY ("dish_id", "allergen_id")
    )
  `);

  let imported = 0;
  for (const row of rows) {
    const allergenId = allergenCache[row.allergen_slug as string];
    if (!allergenId) continue;

    try {
      await pg.query(
        `INSERT INTO dish_allergens (dish_id, allergen_id, severity)
         SELECT d.id, $2, $3 FROM dishes d WHERE d.legacy_id = $1
         ON CONFLICT DO NOTHING`,
        [row.dish_legacy_id, allergenId, row.severity || 'may_contain']
      );
      imported++;
    } catch { /* skip */ }
  }
  log('dish_allergens', `Импортировано ${imported} связей`);
}

async function importPhotos(sqlite: Database.Database, pg: Pool) {
  const rows = sqlite.prepare(
    `SELECT p.*, r.slug AS r_slug FROM photos p
     JOIN restaurants r ON r.id = p.restaurant_id AND r.is_duplicate = 0
     WHERE p.url IS NOT NULL AND p.url != '' AND p.url LIKE 'http%'`
  ).all() as Array<Record<string, unknown>>;
  log('photos', `Найдено ${rows.length} фото`);
  if (isDryRun) return;

  let imported = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    for (const row of batch) {
      try {
        await pg.query(
          `INSERT INTO photos (restaurant_id, url, alt_text, is_cover, sort_order, source)
           SELECT r.id, $2, $3, $4, $5, $6 FROM restaurants r WHERE r.slug = $1`,
          [
            row.r_slug, row.url, row.caption || null,
            row.is_primary ? true : false,
            0, row.source || 'import',
          ]
        );
        imported++;
      } catch { /* skip */ }
    }

    if (i % 5000 === 0) log('photos', `Прогресс: ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
  }
  log('photos', `Импортировано ${imported} фото`);
}

async function importReviews(sqlite: Database.Database, pg: Pool) {
  const rows = sqlite.prepare(
    `SELECT rv.*, r.slug AS r_slug FROM reviews rv
     JOIN restaurants r ON r.id = rv.restaurant_id AND r.is_duplicate = 0
     WHERE rv.text IS NOT NULL OR rv.rating IS NOT NULL`
  ).all() as Array<Record<string, unknown>>;
  log('reviews', `Найдено ${rows.length} отзывов`);
  if (isDryRun) return;

  let imported = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    for (const row of batch) {
      const rating = Math.min(5, Math.max(1, Math.round(Number(row.rating) || 3)));
      try {
        await pg.query(
          `INSERT INTO reviews (restaurant_id, rating_overall, rating_food, rating_service, rating_atmosphere, rating_value, text, author_name, status, legacy_id)
           SELECT r.id, $2, $2, $2, $2, $2, $3, $4, 'approved', $5 FROM restaurants r WHERE r.slug = $1`,
          [row.r_slug, rating, row.text || null, row.author || null, row.legacy_id || null]
        );
        imported++;
      } catch { /* skip */ }
    }

    if (i % 2000 === 0) log('reviews', `Прогресс: ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
  }
  log('reviews', `Импортировано ${imported} отзывов`);
}

async function recalcRatings(pg: Pool) {
  log('recalc', 'Пересчёт рейтингов...');
  if (isDryRun) return;

  await pg.query(`
    UPDATE restaurants SET
      rating = COALESCE(
        (SELECT ROUND(AVG(rating_overall)::numeric, 2)
         FROM reviews WHERE restaurant_id = restaurants.id AND status = 'approved'),
        0
      ),
      review_count = (
        SELECT COUNT(*) FROM reviews WHERE restaurant_id = restaurants.id AND status = 'approved'
      )
  `);

  const result = await pg.query(`SELECT COUNT(*) as cnt FROM restaurants WHERE rating > 0`);
  log('recalc', `Рестораны с рейтингом: ${result.rows[0].cnt}`);
}

// ─── Main ───────────────────────────────────────────────────────────────────

const STEPS = [
  { name: 'cities',                fn: importCities },
  { name: 'districts',             fn: importDistricts },
  { name: 'chains',                fn: importChains },
  { name: 'cuisines',              fn: importCuisines },
  { name: 'restaurants',           fn: importRestaurants },
  { name: 'restaurant_cuisines',   fn: importRestaurantCuisines },
  { name: 'restaurant_features',   fn: importRestaurantFeatures },
  { name: 'restaurant_locations',  fn: importRestaurantLocations },
  { name: 'working_hours',         fn: importWorkingHours },
  { name: 'menu_categories',       fn: importMenuCategories },
  { name: 'dishes',                fn: importDishes },
  { name: 'dish_allergens',        fn: importDishAllergens },
  { name: 'photos',                fn: importPhotos },
  { name: 'reviews',               fn: importReviews },
];

async function main() {
  console.log(`\n🚀 Pipeline.db → PostgreSQL${isDryRun ? ' (DRY RUN)' : ''}`);
  console.log(`📂 SQLite: ${PIPELINE_DB_PATH}\n`);

  let sqlite: Database.Database;
  try {
    sqlite = new Database(PIPELINE_DB_PATH, { readonly: true });
  } catch (err) {
    console.error(`❌ Не удалось открыть pipeline.db: ${err}`);
    console.error(`   Путь: ${PIPELINE_DB_PATH}`);
    console.error(`   Сначала запустите pipeline: cd restaurant_pipeline && python main.py --phase 1`);
    process.exit(1);
  }

  const pg = createPgPool();

  try {
    // Проверяем наличие таблиц в PG
    const tableCheck = await pg.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'restaurants'`
    );
    if (tableCheck.rows.length === 0) {
      console.error('❌ Таблица restaurants не найдена в PostgreSQL.');
      console.error('   Сначала запустите backend с synchronize:true или создайте миграции.');
      process.exit(1);
    }

    const stepsToRun = stepArg
      ? STEPS.filter(s => s.name === stepArg)
      : STEPS;

    if (stepsToRun.length === 0) {
      console.error(`❌ Шаг "${stepArg}" не найден. Доступные: ${STEPS.map(s => s.name).join(', ')}`);
      process.exit(1);
    }

    for (const step of stepsToRun) {
      const start = Date.now();
      await step.fn(sqlite, pg);
      log(step.name, `✅ Завершён за ${((Date.now() - start) / 1000).toFixed(1)}s`);
    }

    // Всегда пересчитываем рейтинги в конце
    if (!stepArg) {
      await recalcRatings(pg);
    }

    console.log('\n🎉 Импорт завершён!\n');
  } finally {
    sqlite.close();
    await pg.end();
  }
}

main().catch(err => {
  console.error('❌ Ошибка:', err);
  process.exit(1);
});
