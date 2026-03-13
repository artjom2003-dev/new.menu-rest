/**
 * scripts/migrate.ts
 *
 * Миграция данных из legacy MariaDB (menu_rest) в новый PostgreSQL.
 * Запуск из корня проекта:
 *
 *   npx ts-node scripts/migrate.ts
 *   npx ts-node scripts/migrate.ts --dry-run
 *   npx ts-node scripts/migrate.ts --step cities
 *
 * Требует переменных окружения из .env (см. .env.example):
 *   LEGACY_DB_HOST, LEGACY_DB_PORT, LEGACY_DB_NAME, LEGACY_DB_USER, LEGACY_DB_PASSWORD
 *   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
 *
 * Зависимости: npm install mysql2 --save-dev  (pg уже есть)
 */

import * as mysql from 'mysql2/promise';
import { Pool, PoolClient } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

// ─── Конфигурация ─────────────────────────────────────────────────────────────

const BATCH_SIZE = 500;
const isDryRun   = process.argv.includes('--dry-run');
const stepArg    = process.argv.find(a => a.startsWith('--step='))?.split('=')[1];

// ─── Подключения ──────────────────────────────────────────────────────────────

function createMysqlPool(): mysql.Pool {
  return mysql.createPool({
    host:     process.env.LEGACY_DB_HOST     || 'localhost',
    port:     Number(process.env.LEGACY_DB_PORT) || 3306,
    database: process.env.LEGACY_DB_NAME     || 'menu_rest',
    user:     process.env.LEGACY_DB_USER     || 'root',
    password: process.env.LEGACY_DB_PASSWORD || '',
    charset:  'utf8mb4',
    timezone: 'Z',
    connectionLimit: 5,
  });
}

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

// ─── Утилиты ──────────────────────────────────────────────────────────────────

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

async function uniqueSlug(pg: Pool, table: string, base: string): Promise<string> {
  let slug = slugify(base) || `item`;
  let suffix = 0;
  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const { rowCount } = await pg.query(
      `SELECT 1 FROM ${table} WHERE slug = $1`, [candidate]
    );
    if (rowCount === 0) return candidate;
    suffix++;
  }
}

function priceToPriceLevel(avgBill: number | null): number | null {
  if (!avgBill || avgBill <= 0) return null;
  if (avgBill <= 500)  return 1;
  if (avgBill <= 1500) return 2;
  if (avgBill <= 3000) return 3;
  return 4;
}

function parseTime(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const clean = raw.trim().replace(/[.\-,]/, ':');
  const match = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function parseWifi(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const v = raw.trim().toLowerCase();
  return v === '1' || v === 'yes' || v === 'true' || v === 'да';
}

async function batchInsert<T>(
  pg: Pool,
  items: T[],
  insertFn: (client: PoolClient, batch: T[]) => Promise<number>,
): Promise<number> {
  if (isDryRun || items.length === 0) return items.length;
  let total = 0;
  const client = await pg.connect();
  try {
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      await client.query('BEGIN');
      total += await insertFn(client, batch);
      await client.query('COMMIT');
      process.stdout.write('.');
    }
  } finally {
    client.release();
  }
  return total;
}

// ─── Статистика ───────────────────────────────────────────────────────────────

interface Stats {
  [step: string]: { inserted: number; skipped: number; errors: number };
}
const stats: Stats = {};

function initStat(step: string) {
  stats[step] = { inserted: 0, skipped: 0, errors: 0 };
}

// ─── ШАГ 1: Города ────────────────────────────────────────────────────────────

async function migrateCities(my: mysql.Pool, pg: Pool): Promise<void> {
  initStat('cities');
  console.log('\n[1/9] Города...');

  const [rows] = await my.execute<mysql.RowDataPacket[]>(`
    SELECT rc.id, rc.name, rco.name AS country_name
    FROM rest_city rc
    LEFT JOIN rest_country rco ON rco.id = rc.country_id
    ORDER BY rc.id
  `);

  for (const row of rows) {
    try {
      const slug = await uniqueSlug(pg, 'cities', row.name);
      if (!isDryRun) {
        await pg.query(
          `INSERT INTO cities (name, slug, country, legacy_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (legacy_id) DO NOTHING`,
          [row.name, slug, row.country_name || 'Россия', row.id]
        );
      }
      stats.cities.inserted++;
    } catch {
      stats.cities.errors++;
    }
  }
  console.log(` ✓ ${stats.cities.inserted} городов`);
}

// ─── ШАГ 2: Сети ресторанов ───────────────────────────────────────────────────

async function migrateChains(my: mysql.Pool, pg: Pool): Promise<void> {
  initStat('restaurant_chains');
  console.log('\n[2/9] Сети ресторанов (main=1)...');

  const [rows] = await my.execute<mysql.RowDataPacket[]>(`
    SELECT id, name FROM rest_rest WHERE main = 1 ORDER BY id
  `);

  for (const row of rows) {
    if (!row.name) { stats.restaurant_chains.skipped++; continue; }
    try {
      const slug = await uniqueSlug(pg, 'restaurant_chains', row.name);
      if (!isDryRun) {
        await pg.query(
          `INSERT INTO restaurant_chains (name, slug, legacy_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (legacy_id) DO NOTHING`,
          [row.name, slug, row.id]
        );
      }
      stats.restaurant_chains.inserted++;
    } catch {
      stats.restaurant_chains.errors++;
    }
  }
  console.log(` ✓ ${stats.restaurant_chains.inserted} сетей`);
}

// ─── ШАГ 3: Рестораны ─────────────────────────────────────────────────────────

async function migrateRestaurants(my: mysql.Pool, pg: Pool): Promise<void> {
  initStat('restaurants');
  console.log('\n[3/9] Рестораны...');

  // Берём все конкретные точки (main != 1)
  const [rows] = await my.execute<mysql.RowDataPacket[]>(`
    SELECT
      r.id, r.name, r.city, r.address, r.closestMetro,
      r.lat, r.lon, r.phone, r.www, r.description_ru,
      r.avgBill, r.delivery, r.hasWifi,
      r.instagram, r.vk, r.facebook, r.youtube,
      r.\`2gis_id\`,
      r.parent_id,
      c.id AS chain_new_id
    FROM rest_rest r
    LEFT JOIN restaurant_chains c ON c.legacy_id = r.parent_id
    WHERE r.main != 1
    ORDER BY r.id
  `);

  console.log(`  Найдено: ${rows.length} записей`);

  for (const row of rows) {
    if (!row.name) { stats.restaurants.skipped++; continue; }
    try {
      // city_id из новой таблицы cities
      const cityResult = await pg.query(
        `SELECT id FROM cities WHERE legacy_id = $1`, [row.city]
      );
      if (cityResult.rowCount === 0) {
        stats.restaurants.skipped++;
        continue;
      }
      const cityId = cityResult.rows[0].id;

      const slug = await uniqueSlug(pg, 'restaurants', row.name);
      const priceLevel = priceToPriceLevel(row.avgBill);

      if (!isDryRun) {
        await pg.query(
          `INSERT INTO restaurants (
            chain_id, name, slug, description,
            city_id, address, metro_station, lat, lng,
            phone, website, price_level, average_bill,
            has_wifi, has_delivery,
            status, legacy_id, external_2gis_id
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
          ON CONFLICT (legacy_id) DO NOTHING`,
          [
            row.chain_new_id || null,
            row.name,
            slug,
            row.description_ru || null,
            cityId,
            row.address || null,
            row.closestMetro || null,
            row.lat || null,
            row.lon || null,
            // берём только первый номер если несколько через запятую
            row.phone ? row.phone.split(/[,;\/]/)[0].trim().substring(0, 100) : null,
            row.www || null,
            priceLevel,
            row.avgBill > 0 ? row.avgBill : null,
            parseWifi(row.hasWifi),
            row.delivery === 1,
            'draft',
            row.id,
            row['2gis_id'] || null,
          ]
        );
      }
      stats.restaurants.inserted++;
      if (stats.restaurants.inserted % 1000 === 0) {
        process.stdout.write(`\r  ${stats.restaurants.inserted}/${rows.length}...`);
      }
    } catch (err) {
      stats.restaurants.errors++;
    }
  }
  console.log(`\n ✓ ${stats.restaurants.inserted} ресторанов, пропущено ${stats.restaurants.skipped}, ошибок ${stats.restaurants.errors}`);
}

// ─── ШАГ 4: Расписание ────────────────────────────────────────────────────────

async function migrateWorkingHours(my: mysql.Pool, pg: Pool): Promise<void> {
  initStat('working_hours');
  console.log('\n[4/9] Расписание...');

  const days = [
    { col: 'mon', dow: 0 },
    { col: 'tue', dow: 1 },
    { col: 'wed', dow: 2 },
    { col: 'thu', dow: 3 },
    { col: 'fri', dow: 4 },
    { col: 'sat', dow: 5 },
    { col: 'sun', dow: 6 },
  ];

  const cols = days.map(d =>
    `work_time_${d.col}_begin, work_time_${d.col}_end`
  ).join(', ');

  const [rows] = await my.execute<mysql.RowDataPacket[]>(
    `SELECT id, ${cols} FROM rest_rest WHERE main != 1`
  );

  type HourRow = { restaurantId: number; dow: number; open: string | null; close: string | null };
  const toInsert: HourRow[] = [];

  for (const row of rows) {
    const { rowCount, rows: pgRows } = await pg.query(
      `SELECT id FROM restaurants WHERE legacy_id = $1`, [row.id]
    );
    if (rowCount === 0) continue;
    const restId = pgRows[0].id;

    for (const { col, dow } of days) {
      const open  = parseTime(row[`work_time_${col}_begin`]);
      const close = parseTime(row[`work_time_${col}_end`]);
      if (!open && !close) continue; // не заполнено — пропускаем
      toInsert.push({ restaurantId: restId, dow, open, close });
    }
  }

  const inserted = await batchInsert(pg, toInsert, async (client, batch) => {
    let count = 0;
    for (const h of batch) {
      await client.query(
        `INSERT INTO working_hours (restaurant_id, day_of_week, open_time, close_time)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (restaurant_id, day_of_week) DO NOTHING`,
        [h.restaurantId, h.dow, h.open, h.close]
      );
      count++;
    }
    return count;
  });

  stats.working_hours.inserted = inserted;
  console.log(` ✓ ${stats.working_hours.inserted} записей расписания`);
}

// ─── ШАГ 5: Кухни ─────────────────────────────────────────────────────────────

async function migrateCuisines(my: mysql.Pool, pg: Pool): Promise<void> {
  initStat('cuisines');
  console.log('\n[5/9] Кухни...');

  const [rows] = await my.execute<mysql.RowDataPacket[]>(
    `SELECT id, value FROM rest_answer_items_kitchen ORDER BY id`
  );

  for (const row of rows) {
    if (!row.value) { stats.cuisines.skipped++; continue; }
    try {
      const slug = await uniqueSlug(pg, 'cuisines', row.value);
      if (!isDryRun) {
        await pg.query(
          `INSERT INTO cuisines (name, slug, legacy_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (legacy_id) DO NOTHING`,
          [row.value, slug, row.id]
        );
      }
      stats.cuisines.inserted++;
    } catch {
      stats.cuisines.errors++;
    }
  }
  console.log(` ✓ ${stats.cuisines.inserted} кухонь`);
}

// ─── ШАГ 6: Кухни ресторанов ──────────────────────────────────────────────────
// Источник: rest_rest2kitchen (~6.5M строк → читаем пачками)

async function migrateRestaurantCuisines(my: mysql.Pool, pg: Pool): Promise<void> {
  initStat('restaurant_cuisines');
  console.log('\n[6/9] Кухни ресторанов (большая таблица, пачками)...');

  const [countResult] = await my.execute<mysql.RowDataPacket[]>(
    `SELECT COUNT(DISTINCT restId, kitchenId) AS cnt FROM rest_rest2kitchen`
  );
  const total = Number(countResult[0].cnt);
  console.log(`  Уникальных пар: ~${total}`);

  let offset = 0;
  const limit = 5000;

  while (true) {
    const [rows] = await my.execute<mysql.RowDataPacket[]>(
      `SELECT DISTINCT restId, kitchenId FROM rest_rest2kitchen
       ORDER BY restId, kitchenId LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    if ((rows as mysql.RowDataPacket[]).length === 0) break;

    await batchInsert(pg, rows as mysql.RowDataPacket[], async (client, batch) => {
      let count = 0;
      for (const row of batch) {
        const restResult = await client.query(
          `SELECT id FROM restaurants WHERE legacy_id = $1`, [row.restId]
        );
        const cuisResult = await client.query(
          `SELECT id FROM cuisines WHERE legacy_id = $1`, [row.kitchenId]
        );
        if (restResult.rowCount === 0 || cuisResult.rowCount === 0) {
          stats.restaurant_cuisines.skipped++;
          continue;
        }
        await client.query(
          `INSERT INTO restaurant_cuisines (restaurant_id, cuisine_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [restResult.rows[0].id, cuisResult.rows[0].id]
        );
        count++;
        stats.restaurant_cuisines.inserted++;
      }
      return count;
    });

    offset += limit;
    process.stdout.write(`\r  ${stats.restaurant_cuisines.inserted}/${total}...`);
  }
  console.log(`\n ✓ ${stats.restaurant_cuisines.inserted} связей кухня-ресторан`);
}

// ─── ШАГ 7: Блюда ─────────────────────────────────────────────────────────────

async function migrateDishes(my: mysql.Pool, pg: Pool): Promise<void> {
  initStat('dishes');
  initStat('restaurant_dishes');
  console.log('\n[7/9] Блюда...');

  // Загружаем категории блюд для маппинга section_id → name
  const [sections] = await my.execute<mysql.RowDataPacket[]>(
    `SELECT id, value_ru FROM rest_menu_section WHERE status = 1`
  );
  const sectionMap = new Map<number, string>(
    (sections as mysql.RowDataPacket[]).map(s => [s.id, s.value_ru])
  );

  const [rows] = await my.execute<mysql.RowDataPacket[]>(`
    SELECT
      m.id, m.rest_id, m.section_id,
      m.title_ru, m.description_ru, m.composition,
      m.price, m.weight, m.volume,
      m.calories, m.proteins, m.fats, m.carbohydrates,
      m.status
    FROM rest_menu m
    WHERE m.status = 1
      AND m.title_ru IS NOT NULL
      AND m.title_ru != ''
    ORDER BY m.rest_id, m.id
  `);

  console.log(`  Найдено: ${rows.length} блюд`);

  for (const row of rows) {
    try {
      // Найти ресторан в новой БД
      const restResult = await pg.query(
        `SELECT id FROM restaurants WHERE legacy_id = $1`, [row.rest_id]
      );
      if (restResult.rowCount === 0) {
        stats.dishes.skipped++;
        stats.restaurant_dishes.skipped++;
        continue;
      }
      const restaurantId = restResult.rows[0].id;

      // Цена: decimal рубли → int копейки
      const rawPrice = parseFloat(row.price) || 0;
      const priceKopecks = Math.round(rawPrice * 100);

      // Вес: может быть текст типа "200 г" или "200/100"
      const weightMatch = String(row.weight || '').match(/^\d+/);
      const weightGrams = weightMatch ? parseInt(weightMatch[0], 10) : null;

      // Объём: литры → мл
      const volumeMl = row.volume ? Math.round(parseFloat(row.volume) * 1000) : null;

      // Категория (название из справочника секций)
      const categoryName = row.section_id ? sectionMap.get(row.section_id) || null : null;

      if (!isDryRun) {
        // 1. Создать блюдо
        const dishResult = await pg.query(
          `INSERT INTO dishes (
            name, description, composition,
            calories, protein, fat, carbs,
            weight_grams, volume_ml, legacy_id
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT (legacy_id) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [
            row.title_ru,
            row.description_ru || null,
            row.composition || null,
            row.calories || null,
            row.proteins || null,
            row.fats || null,
            row.carbohydrates || null,
            weightGrams,
            volumeMl,
            row.id,
          ]
        );
        const dishId = dishResult.rows[0].id;

        // 2. Связать с рестораном
        await pg.query(
          `INSERT INTO restaurant_dishes (restaurant_id, dish_id, category_name, price, is_available)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (restaurant_id, dish_id) DO NOTHING`,
          [restaurantId, dishId, categoryName, priceKopecks, true]
        );
      }

      stats.dishes.inserted++;
      stats.restaurant_dishes.inserted++;

      if (stats.dishes.inserted % 500 === 0) {
        process.stdout.write(`\r  ${stats.dishes.inserted}/${rows.length}...`);
      }
    } catch (err) {
      stats.dishes.errors++;
    }
  }
  console.log(`\n ✓ ${stats.dishes.inserted} блюд, ${stats.restaurant_dishes.inserted} restaurant_dishes`);
}

// ─── ШАГ 8: Фотографии ────────────────────────────────────────────────────────

async function migratePhotos(my: mysql.Pool, pg: Pool): Promise<void> {
  initStat('photos');
  console.log('\n[8/9] Фотографии...');

  const photoBaseUrl = process.env.LEGACY_PHOTO_BASE_URL || '/legacy-photos';

  // 8.1 Собственные фото ресторанов (filename → URL)
  const [ownPhotos] = await my.execute<mysql.RowDataPacket[]>(`
    SELECT id, rest_id, filename, ordering
    FROM rest_rest_photo
    WHERE (nofile = 0 OR nofile IS NULL)
      AND filename IS NOT NULL AND filename != ''
    ORDER BY rest_id, ordering
  `);
  console.log(`  rest_rest_photo: ${ownPhotos.length}`);

  for (const row of ownPhotos) {
    try {
      const restResult = await pg.query(
        `SELECT id FROM restaurants WHERE legacy_id = $1`, [row.rest_id]
      );
      if (restResult.rowCount === 0) { stats.photos.skipped++; continue; }

      const url = `${photoBaseUrl}/${row.filename}`;
      if (!isDryRun) {
        await pg.query(
          `INSERT INTO photos (restaurant_id, url, source, sort_order, legacy_id)
           VALUES ($1,$2,'legacy',$3,$4)
           ON CONFLICT DO NOTHING`,
          [restResult.rows[0].id, url, row.ordering ?? 0, row.id]
        );
      }
      stats.photos.inserted++;
    } catch {
      stats.photos.errors++;
    }
  }
  process.stdout.write('.');

  // 8.2 Фотографии из 2ГИС (URL уже есть)
  const [gisPhotos] = await my.execute<mysql.RowDataPacket[]>(`
    SELECT id, rest_id, url, 2gis_photo_nr AS photo_nr, description
    FROM rest_rest_photo_2gis
    WHERE url IS NOT NULL AND url != ''
    ORDER BY rest_id, 2gis_photo_nr
  `);
  console.log(`\n  rest_rest_photo_2gis: ${gisPhotos.length}`);

  for (const row of gisPhotos) {
    try {
      const restResult = await pg.query(
        `SELECT id FROM restaurants WHERE legacy_id = $1`, [row.rest_id]
      );
      if (restResult.rowCount === 0) { stats.photos.skipped++; continue; }

      if (!isDryRun) {
        await pg.query(
          `INSERT INTO photos (restaurant_id, url, source, sort_order)
           VALUES ($1,$2,'2gis',$3)
           ON CONFLICT DO NOTHING`,
          [restResult.rows[0].id, row.url, row.photo_nr ?? 0]
        );
      }
      stats.photos.inserted++;
      if (stats.photos.inserted % 5000 === 0) {
        process.stdout.write(`\r  фото: ${stats.photos.inserted}...`);
      }
    } catch {
      stats.photos.errors++;
    }
  }
  console.log(`\n ✓ ${stats.photos.inserted} фото, пропущено ${stats.photos.skipped}`);
}

// ─── ШАГ 9: Отзывы ────────────────────────────────────────────────────────────

async function migrateReviews(my: mysql.Pool, pg: Pool): Promise<void> {
  initStat('reviews');
  console.log('\n[9/9] Отзывы...');

  const [rows] = await my.execute<mysql.RowDataPacket[]>(`
    SELECT
      id, restId, userId,
      firstname, lastname, text,
      rate, ratingQuality, ratingService, ratingInterior,
      status, date
    FROM rest_review
    ORDER BY id
  `);

  for (const row of rows) {
    try {
      const restResult = await pg.query(
        `SELECT id FROM restaurants WHERE legacy_id = $1`, [row.restId]
      );
      if (restResult.rowCount === 0) { stats.reviews.skipped++; continue; }

      const authorName = [row.firstname, row.lastname].filter(Boolean).join(' ').trim() || 'Гость';
      const reviewStatus = row.status === 1 ? 'approved' : 'pending';

      // rate может быть 1-5 или 1-10 — нормализуем до 1-5
      const normalizeRating = (v: number | null): number | null => {
        if (!v) return null;
        if (v > 5) return Math.round(v / 2); // 1-10 → 1-5
        return Math.min(5, Math.max(1, v));
      };

      if (!isDryRun) {
        await pg.query(
          `INSERT INTO reviews (
            restaurant_id, author_name,
            rating_food, rating_service, rating_atmosphere, rating_overall,
            text, status, created_at, legacy_id
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT (legacy_id) DO NOTHING`,
          [
            restResult.rows[0].id,
            authorName,
            normalizeRating(row.ratingQuality),
            normalizeRating(row.ratingService),
            normalizeRating(row.ratingInterior),
            normalizeRating(row.rate),
            row.text || null,
            reviewStatus,
            row.date || new Date(),
            row.id,
          ]
        );
      }
      stats.reviews.inserted++;
    } catch {
      stats.reviews.errors++;
    }
  }
  console.log(` ✓ ${stats.reviews.inserted} отзывов`);
}

// ─── Пересчёт рейтингов ───────────────────────────────────────────────────────

async function updateRatings(pg: Pool): Promise<void> {
  if (isDryRun) return;
  console.log('\n[+] Пересчёт рейтингов ресторанов...');
  await pg.query(`
    UPDATE restaurants r
    SET
      rating = COALESCE((
        SELECT ROUND(AVG(rating_overall)::numeric, 2)
        FROM reviews
        WHERE restaurant_id = r.id AND status = 'approved'
      ), 0),
      review_count = COALESCE((
        SELECT COUNT(*) FROM reviews
        WHERE restaurant_id = r.id AND status = 'approved'
      ), 0),
      updated_at = NOW()
  `);
  console.log(' ✓ Рейтинги обновлены');
}

// ─── Точка входа ──────────────────────────────────────────────────────────────

const ALL_STEPS: Record<string, (my: mysql.Pool, pg: Pool) => Promise<void>> = {
  cities:               migrateCities,
  chains:               migrateChains,
  restaurants:          migrateRestaurants,
  working_hours:        migrateWorkingHours,
  cuisines:             migrateCuisines,
  restaurant_cuisines:  migrateRestaurantCuisines,
  dishes:               migrateDishes,
  photos:               migratePhotos,
  reviews:              migrateReviews,
};

async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log('Menu-Rest Legacy Migration');
  if (isDryRun) console.log('*** DRY RUN — данные не записываются ***');
  if (stepArg)  console.log(`*** STEP = ${stepArg} ***`);
  console.log(`${'='.repeat(60)}`);

  const my = createMysqlPool();
  const pg = createPgPool();

  // Проверка подключений
  try {
    await my.execute('SELECT 1');
    console.log('✓ MySQL: подключено');
  } catch (err) {
    console.error('✗ MySQL: ошибка подключения', err);
    process.exit(1);
  }

  try {
    await pg.query('SELECT 1');
    console.log('✓ PostgreSQL: подключено');
  } catch (err) {
    console.error('✗ PostgreSQL: ошибка подключения', err);
    process.exit(1);
  }

  const steps = stepArg
    ? { [stepArg]: ALL_STEPS[stepArg] }
    : ALL_STEPS;

  if (stepArg && !ALL_STEPS[stepArg]) {
    console.error(`Неизвестный шаг: ${stepArg}. Доступные: ${Object.keys(ALL_STEPS).join(', ')}`);
    process.exit(1);
  }

  for (const [name, fn] of Object.entries(steps)) {
    try {
      await fn(my, pg);
    } catch (err) {
      console.error(`\n✗ Шаг "${name}" завершился с ошибкой:`, err);
    }
  }

  if (!stepArg) {
    await updateRatings(pg);
  }

  // Итоговый отчёт
  console.log(`\n${'='.repeat(60)}`);
  console.log('Итоги миграции:');
  for (const [step, s] of Object.entries(stats)) {
    console.log(`  ${step.padEnd(25)} вставлено: ${String(s.inserted).padStart(8)}  пропущено: ${s.skipped}  ошибок: ${s.errors}`);
  }
  if (isDryRun) {
    console.log('\n*** DRY RUN завершён — данные не записывались ***');
  }
  console.log(`${'='.repeat(60)}\n`);

  await my.end();
  await pg.end();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
