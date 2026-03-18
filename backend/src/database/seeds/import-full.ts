import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as BetterSqlite3 from 'better-sqlite3';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const PIPELINE_DB = path.resolve(__dirname, '../../../../restaurant_pipeline/data/processed/pipeline.db');

const CITY_NAME_TO_SLUG: Record<string, string> = {
  'Москва': 'moscow',
  'Санкт-Петербург': 'spb',
  'Казань': 'kazan',
  'Екатеринбург': 'ekb',
  'Новосибирск': 'novosibirsk',
  'Сочи': 'sochi',
  'Краснодар': 'krasnodar',
  'Нижний Новгород': 'nnov',
  'Самара': 'samara',
  'Уфа': 'ufa',
  'Ростов-на-Дону': 'rostov',
  'Воронеж': 'voronezh',
  'Красноярск': 'krasnoyarsk',
};

// Map pipeline cuisine names → seed slugs
const CUISINE_NAME_TO_SLUG: Record<string, string> = {
  'итальянская': 'italian',
  'японская': 'japanese',
  'грузинская': 'georgian',
  'французская': 'french',
  'русская': 'russian',
  'паназиатская': 'pan-asian',
  'азиатская': 'pan-asian',
  'китайская': 'chinese',
  'узбекская': 'uzbek',
  'мексиканская': 'mexican',
  'индийская': 'indian',
  'средиземноморская': 'mediterranean',
  'американская': 'american',
  'морепродукты': 'seafood',
  'вегетарианская': 'vegetarian',
  'турецкая': 'turkish',
  'кавказская': 'caucasian',
  'европейская': 'european',
  'авторская': 'author',
  'фьюжн': 'fusion',
  'стейк': 'steakhouse',
};

const BATCH_SIZE = 100;

const pg = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'menurest',
  username: process.env.DB_USER || 'menurest',
  password: process.env.DB_PASSWORD,
  synchronize: false,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
});

function cleanText(s: string | null): string | null {
  if (!s) return null;
  return s.replace(/\0/g, '');
}

function slugify(text: string): string {
  const translitMap: Record<string, string> = {
    'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh',
    'з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o',
    'п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts',
    'ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
  };
  return text
    .toLowerCase()
    .split('')
    .map(c => translitMap[c] || c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 190);
}

function guessPriceLevel(avgBill: number | null, priceRange: string | null): number {
  if (avgBill) {
    if (avgBill <= 800) return 1;
    if (avgBill <= 1500) return 2;
    if (avgBill <= 3000) return 3;
    return 4;
  }
  if (priceRange === '$') return 1;
  if (priceRange === '$$') return 2;
  if (priceRange === '$$$') return 3;
  if (priceRange === '$$$$') return 4;
  return 2; // default
}

async function run() {
  const SqliteDB = (BetterSqlite3 as any).default || BetterSqlite3;
  const sqlite = new SqliteDB(PIPELINE_DB, { readonly: true });
  await pg.initialize();

  console.log('='.repeat(60));
  console.log('  FULL IMPORT: pipeline.db → PostgreSQL');
  console.log('='.repeat(60));

  // ── Step 0: Ensure reference data (cities, cuisines) ──────────
  console.log('\n[Step 0] Loading reference data...');

  // Ensure all cities exist
  for (const [name, slug] of Object.entries(CITY_NAME_TO_SLUG)) {
    await pg.query(
      `INSERT INTO cities (name, slug) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING`,
      [name, slug],
    );
  }

  const pgCities = await pg.query('SELECT id, slug, name FROM cities');
  const cityIdBySlug: Record<string, number> = {};
  const cityIdByName: Record<string, number> = {};
  for (const c of pgCities) {
    cityIdBySlug[c.slug] = c.id;
    cityIdByName[c.name] = c.id;
  }

  // Also map by CITY_NAME_TO_SLUG
  for (const [name, slug] of Object.entries(CITY_NAME_TO_SLUG)) {
    if (cityIdBySlug[slug]) cityIdByName[name] = cityIdBySlug[slug];
  }

  const pgCuisines = await pg.query('SELECT id, slug, name FROM cuisines');
  const cuisineIdBySlug: Record<string, number> = {};
  for (const c of pgCuisines) cuisineIdBySlug[c.slug] = c.id;

  const pgFeatures = await pg.query('SELECT id, slug FROM features');
  const featureIdBySlug: Record<string, number> = {};
  for (const f of pgFeatures) featureIdBySlug[f.slug] = f.id;

  console.log(`  Cities: ${pgCities.length}, Cuisines: ${pgCuisines.length}, Features: ${pgFeatures.length}`);

  // ── Step 1: Get target restaurants from pipeline.db ──────────
  console.log('\n[Step 1] Selecting restaurants...');

  // Phase 1: full data (menu + photos + hours + cuisines + description)
  const fullRestaurants = sqlite.prepare(`
    SELECT DISTINCT r.id
    FROM restaurants r
    WHERE r.is_duplicate = 0
      AND LENGTH(r.description) > 100
      AND r.id IN (SELECT DISTINCT restaurant_id FROM dishes)
      AND r.id IN (SELECT DISTINCT restaurant_id FROM photos)
      AND r.id IN (SELECT DISTINCT restaurant_id FROM working_hours)
      AND r.id IN (SELECT DISTINCT restaurant_id FROM restaurant_cuisines)
    ORDER BY r.id
  `).all() as { id: number }[];

  // Phase 2: partial data (description >50, at least photos or hours or cuisines, NOT in phase 1)
  const fullIds = new Set(fullRestaurants.map(r => r.id));
  const partialRestaurants = sqlite.prepare(`
    SELECT DISTINCT r.id
    FROM restaurants r
    WHERE r.is_duplicate = 0
      AND LENGTH(r.description) > 50
      AND (
        r.id IN (SELECT DISTINCT restaurant_id FROM photos)
        OR r.id IN (SELECT DISTINCT restaurant_id FROM working_hours)
        OR r.id IN (SELECT DISTINCT restaurant_id FROM restaurant_cuisines)
      )
    ORDER BY r.id
  `).all().filter((r: any) => !fullIds.has(r.id)) as { id: number }[];

  const targetRestaurants = [...fullRestaurants, ...partialRestaurants];
  console.log(`  Full data: ${fullRestaurants.length}, Partial: ${partialRestaurants.length}, Total: ${targetRestaurants.length}`);

  // ── Step 2: Clean existing data ───────────────────────────────
  console.log('\n[Step 2] Cleaning old data...');
  await pg.query('TRUNCATE restaurant_dishes, dishes, menu_categories, working_hours, photos, restaurant_cuisines, restaurant_features, restaurants RESTART IDENTITY CASCADE');

  // Sequences already reset by RESTART IDENTITY
  console.log('  Done.');

  // ── Step 3: Import restaurants ────────────────────────────────
  console.log('\n[Step 3] Importing restaurants...');

  const usedSlugs = new Set<string>();
  let imported = 0;
  let skipped = 0;
  let totalDishes = 0;
  let totalPhotos = 0;
  let totalHours = 0;

  // Prepare SQLite statements
  const stmtRest = sqlite.prepare('SELECT * FROM restaurants WHERE id = ?');
  const stmtDishes = sqlite.prepare('SELECT * FROM dishes WHERE restaurant_id = ? ORDER BY category, name');
  const stmtPhotos = sqlite.prepare('SELECT * FROM photos WHERE restaurant_id = ? ORDER BY is_primary DESC, id');
  const stmtHours = sqlite.prepare('SELECT * FROM working_hours WHERE restaurant_id = ? ORDER BY day_of_week');
  const stmtCuisines = sqlite.prepare(`
    SELECT c.name, c.slug FROM restaurant_cuisines rc
    JOIN cuisines c ON c.id = rc.cuisine_id
    WHERE rc.restaurant_id = ?
  `);

  for (let i = 0; i < targetRestaurants.length; i++) {
    const srcId = targetRestaurants[i].id;
    const r = stmtRest.get(srcId) as any;
    if (!r) continue;

    // Map city
    const cityId = cityIdByName[r.city];
    if (!cityId) {
      skipped++;
      continue;
    }

    // Generate unique slug — append city + incremental counter for duplicates
    let baseSlug = slugify(r.name);
    if (!baseSlug) baseSlug = `restaurant-${srcId}`;
    let slug = baseSlug;
    if (usedSlugs.has(slug)) {
      // Try with city slug
      const cSlug = CITY_NAME_TO_SLUG[r.city] || '';
      slug = cSlug ? `${baseSlug}-${cSlug}` : `${baseSlug}-${srcId}`;
      // If still duplicate, append counter
      let counter = 2;
      while (usedSlugs.has(slug)) {
        slug = `${baseSlug}-${cSlug || 'r'}-${counter++}`;
      }
    }
    usedSlugs.add(slug);

    const priceLevel = guessPriceLevel(r.average_bill, r.price_range);
    // rubles → kopeks, cap at 100K rubles (10M kopeks) to avoid INT overflow
    const avgBill = r.average_bill ? Math.min(Math.round(r.average_bill * 100), 10000000) : null;

    try {
      // Insert restaurant
      const [inserted] = await pg.query(`
        INSERT INTO restaurants (
          name, slug, description, city_id, address, metro_station,
          lat, lng, phone, website, price_level, average_bill,
          has_wifi, has_delivery, rating, review_count,
          status, is_verified, published_at, legacy_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'published',false,NOW(),$17)
        RETURNING id
      `, [
        cleanText(r.name) || r.name, slug,
        cleanText(r.description),
        cityId,
        cleanText(r.address),
        cleanText(r.metro_station),
        r.lat || null, r.lng || null,
        r.phone || null, r.website || null,
        priceLevel, avgBill,
        r.has_wifi === 1, r.has_delivery === 1,
        Math.min((r.rating || 0) / 2, 5.00).toFixed(2), r.review_count || 0,
        r.legacy_id || null,
      ]);
      const restaurantId = inserted.id;

      // ── Cuisines ──
      const cuisines = stmtCuisines.all(srcId) as any[];
      for (const c of cuisines) {
        // Try to map cuisine name → slug
        const cName = (c.name || '').toLowerCase().trim();
        const cSlug = CUISINE_NAME_TO_SLUG[cName] || c.slug;
        const cId = cuisineIdBySlug[cSlug];
        if (cId) {
          await pg.query(
            'INSERT INTO restaurant_cuisines (restaurant_id, cuisine_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
            [restaurantId, cId],
          );
        }
      }

      // ── Features ──
      try {
        const features = JSON.parse(r.features || '[]') as string[];
        for (const fs of features) {
          const fid = featureIdBySlug[fs];
          if (fid) {
            await pg.query(
              'INSERT INTO restaurant_features (restaurant_id, feature_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
              [restaurantId, fid],
            );
          }
        }
      } catch {}

      // ── Photos ──
      const photos = stmtPhotos.all(srcId) as any[];
      for (let p = 0; p < photos.length; p++) {
        await pg.query(
          `INSERT INTO photos (restaurant_id, url, sort_order, is_cover, source, alt_text)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            restaurantId,
            photos[p].url,
            p,
            p === 0,
            photos[p].source || 'legacy',
            cleanText(photos[p].caption) || `${r.name} — фото ${p + 1}`,
          ],
        );
      }
      totalPhotos += photos.length;

      // ── Working Hours ──
      const hours = stmtHours.all(srcId) as any[];
      for (const h of hours) {
        await pg.query(
          `INSERT INTO working_hours (restaurant_id, day_of_week, open_time, close_time, is_closed)
           VALUES ($1,$2,$3,$4,$5)`,
          [restaurantId, h.day_of_week, h.open_time || null, h.close_time || null, h.is_closed === 1],
        );
      }
      totalHours += hours.length;

      // ── Dishes → dishes + restaurant_dishes ──
      const dishes = stmtDishes.all(srcId) as any[];
      // Track menu categories for this restaurant
      const categoryIds: Record<string, number> = {};
      let sortOrder = 0;
      let dishErrors = 0;

      for (const d of dishes) {
        try {
          const categoryName = cleanText((d.category || 'Другое').trim())!.substring(0, 200);

          // Create menu category if not exists for this restaurant
          if (!categoryIds[categoryName]) {
            const [cat] = await pg.query(
              `INSERT INTO menu_categories (restaurant_id, name, sort_order)
               VALUES ($1,$2,$3) RETURNING id`,
              [restaurantId, categoryName, Object.keys(categoryIds).length],
            );
            categoryIds[categoryName] = cat.id;
          }

          // Insert dish (global dish table)
          // Clamp price: max 100,000 rubles = 10,000,000 kopeks; skip garbage prices
          const rawPrice = d.price ? Math.round(d.price * 100) : 0;
          const priceKopeks = Math.min(Math.max(rawPrice, 0), 10000000);
          const weightGrams = d.weight ? parseInt(d.weight) || null : null;

          // Clean and truncate text fields
          const dishName = cleanText(d.name)?.substring(0, 300) || 'Без названия';

          const [dish] = await pg.query(`
            INSERT INTO dishes (name, description, composition, calories, protein, fat, carbs,
                                weight_grams, image_url, is_healthy_choice)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
            RETURNING id
          `, [
            dishName,
            cleanText(d.description),
            cleanText(d.composition),
            d.calories || null,
            d.protein || null,
            d.fat || null,
            d.carbs || null,
            weightGrams,
            d.photo_url || null,
            d.is_healthy_choice === 1,
          ]);

          // Link dish to restaurant
          await pg.query(
            `INSERT INTO restaurant_dishes (restaurant_id, dish_id, menu_category_id, category_name, price, is_available, sort_order)
             VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
            [restaurantId, dish.id, categoryIds[categoryName], categoryName, priceKopeks, true, sortOrder++],
          );
          totalDishes++;
        } catch (dishErr: any) {
          dishErrors++;
          if (dishErrors <= 3) {
            console.warn(`    dish error in "${r.name}": ${dishErr.message.substring(0, 100)}`);
          }
        }
      }
      imported++;

      if (imported % 500 === 0) {
        console.log(`  ${imported}/${targetRestaurants.length} — ${r.name} (${r.city})`);
      }
    } catch (err: any) {
      console.error(`  !! Error on "${r.name}" (id=${srcId}): ${err.message}`);
      skipped++;
    }
  }

  // ── Summary ───────────────────────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log('  IMPORT COMPLETE');
  console.log('='.repeat(60));
  console.log(`  Restaurants: ${imported.toLocaleString()} imported, ${skipped} skipped`);
  console.log(`  Dishes:      ${totalDishes.toLocaleString()}`);
  console.log(`  Photos:      ${totalPhotos.toLocaleString()}`);
  console.log(`  Hours:       ${totalHours.toLocaleString()}`);

  sqlite.close();
  await pg.destroy();
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
