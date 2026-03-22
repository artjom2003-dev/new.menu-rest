/**
 * Восстановление фото из pipeline.db для ресторанов,
 * у которых slug не совпал при основном импорте.
 *
 * Матчинг: 1) по legacy_id  2) по name + city
 * Только HTTP-ссылки, без дубликатов.
 *
 * Запуск: cd backend && npx ts-node scripts/recover-photos.ts
 */
import 'reflect-metadata';
import * as path from 'path';
import * as dotenv from 'dotenv';
import Database = require('better-sqlite3');
import { DataSource } from 'typeorm';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PIPELINE_DB = path.resolve(__dirname, '../../restaurant_pipeline/data/processed/pipeline.db');

const pgDS = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'menurest',
  username: process.env.DB_USER || 'menurest',
  password: process.env.DB_PASSWORD,
  synchronize: false,
  entities: [],
});

interface PipelinePhoto {
  url: string;
  caption: string | null;
  is_primary: number;
  source: string;
  pipeline_restaurant_id: number;
}

interface PipelineRestaurant {
  id: number;
  name: string;
  city: string | null;
  legacy_id: number | null;
  slug: string;
}

async function run() {
  await pgDS.initialize();
  console.log('🔌 PostgreSQL connected');

  const sqlite = new Database(PIPELINE_DB, { readonly: true });
  console.log('🔌 Pipeline.db connected\n');

  // ── 1. Собираем рестораны из pipeline, у которых есть HTTP-фото ──
  const pipelineRests: PipelineRestaurant[] = sqlite.prepare(`
    SELECT DISTINCT r.id, r.name, r.city, r.legacy_id, r.slug
    FROM restaurants r
    JOIN photos p ON p.restaurant_id = r.id
    WHERE r.is_duplicate = 0
      AND p.url IS NOT NULL AND p.url LIKE 'http%'
  `).all() as PipelineRestaurant[];

  console.log(`📊 Pipeline: ${pipelineRests.length} ресторанов с HTTP-фото`);

  // ── 2. Загружаем PG-рестораны (без тяжёлого подзапроса) ──
  console.log('  Загрузка ресторанов из PG...');
  const pgRests: Array<{ id: number; name: string; legacy_id: number | null; slug: string; city_name: string | null }> =
    await pgDS.query(`
      SELECT r.id, r.name, r.legacy_id, r.slug, c.name as city_name
      FROM restaurants r
      LEFT JOIN cities c ON c.id = r.city_id
      WHERE r.status = 'published'
    `);
  console.log(`  ${pgRests.length} ресторанов`);

  // Множество ресторанов у которых УЖЕ есть фото
  console.log('  Загрузка restaurant_id с фото...');
  const hasPhotoRows: Array<{ restaurant_id: number }> = await pgDS.query(
    'SELECT DISTINCT restaurant_id FROM photos'
  );
  const hasPhotoSet = new Set(hasPhotoRows.map(r => r.restaurant_id));
  console.log(`  ${hasPhotoSet.size} ресторанов с фото`);

  // Существующие URL в PG — чтобы не дублировать
  console.log('  Загрузка существующих URL...');
  const existingUrls = new Set<string>();
  const urlRows: Array<{ url: string }> = await pgDS.query('SELECT url FROM photos');
  for (const r of urlRows) existingUrls.add(r.url);

  // Индексы для быстрого поиска
  const pgBySlug = new Map(pgRests.map(r => [r.slug, r]));
  const pgByLegacyId = new Map<number, typeof pgRests[0]>();
  const pgByNameCity = new Map<string, typeof pgRests[0]>();

  for (const r of pgRests) {
    if (r.legacy_id) pgByLegacyId.set(r.legacy_id, r);
    const key = `${r.name.toLowerCase().trim()}|||${(r.city_name || '').toLowerCase().trim()}`;
    if (!pgByNameCity.has(key)) pgByNameCity.set(key, r);
  }

  console.log(`📊 PostgreSQL: ${pgRests.length} ресторанов, ${existingUrls.size} фото-URL\n`);

  // ── 3. Матчинг и сбор фото для вставки ──
  const toInsert: Array<{ pg_restaurant_id: number; url: string; caption: string | null; is_cover: boolean; source: string }> = [];
  let matchedBySlug = 0;
  let matchedByLegacy = 0;
  let matchedByName = 0;
  let skippedHasPhotos = 0;
  let noMatch = 0;

  const getPhotosStmt = sqlite.prepare(`
    SELECT url, caption, is_primary, source
    FROM photos
    WHERE restaurant_id = ? AND url IS NOT NULL AND url LIKE 'http%'
  `);

  for (const pRest of pipelineRests) {
    // Попробовать slug (уже импортированные — пропустить)
    let pgRest = pgBySlug.get(pRest.slug);
    if (pgRest) {
      matchedBySlug++;
      if (hasPhotoSet.has(pgRest.id)) {
        skippedHasPhotos++;
        continue; // уже есть фото
      }
    }

    // Попробовать legacy_id
    if (!pgRest && pRest.legacy_id) {
      pgRest = pgByLegacyId.get(pRest.legacy_id);
      if (pgRest) matchedByLegacy++;
    }

    // Попробовать name + city
    if (!pgRest) {
      const key = `${pRest.name.toLowerCase().trim()}|||${(pRest.city || '').toLowerCase().trim()}`;
      pgRest = pgByNameCity.get(key);
      if (pgRest) matchedByName++;
    }

    if (!pgRest) {
      noMatch++;
      continue;
    }

    // Пропускаем если у PG-ресторана уже есть фото
    if (hasPhotoSet.has(pgRest.id)) {
      skippedHasPhotos++;
      continue;
    }

    // Собираем фото
    const photos = getPhotosStmt.all(pRest.id) as PipelinePhoto[];
    for (const photo of photos) {
      if (existingUrls.has(photo.url)) continue; // уже есть в PG
      toInsert.push({
        pg_restaurant_id: pgRest.id,
        url: photo.url,
        caption: photo.caption || null,
        is_cover: photo.is_primary === 1,
        source: photo.source || 'import',
      });
      existingUrls.add(photo.url); // не вставлять дубли
    }
  }

  sqlite.close();

  console.log('📋 Матчинг:');
  console.log(`   По slug (уже импортированы): ${matchedBySlug}`);
  console.log(`   По legacy_id: ${matchedByLegacy}`);
  console.log(`   По name+city: ${matchedByName}`);
  console.log(`   Пропущено (уже есть фото): ${skippedHasPhotos}`);
  console.log(`   Не найдено в PG: ${noMatch}`);
  console.log(`\n📸 К вставке: ${toInsert.length} фото`);

  if (toInsert.length === 0) {
    console.log('✅ Нечего восстанавливать.');
    await pgDS.destroy();
    return;
  }

  // ── 4. Вставка батчами ──
  const BATCH = 500;
  let inserted = 0;

  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH);
    for (const photo of batch) {
      try {
        await pgDS.query(
          `INSERT INTO photos (restaurant_id, url, alt_text, is_cover, sort_order, source)
           VALUES ($1, $2, $3, $4, 0, $5)
           ON CONFLICT DO NOTHING`,
          [photo.pg_restaurant_id, photo.url, photo.caption, photo.is_cover, photo.source],
        );
        inserted++;
      } catch (err: any) {
        // skip individual errors
      }
    }
    if ((i + BATCH) % 2000 === 0 || i + BATCH >= toInsert.length) {
      console.log(`   Вставлено: ${inserted}/${toInsert.length}`);
    }
  }

  // ── 5. Проверка ──
  const afterCount = await pgDS.query('SELECT COUNT(*) as c FROM photos');
  const afterRests = await pgDS.query('SELECT COUNT(DISTINCT restaurant_id) as c FROM photos');
  console.log(`\n✅ Готово! Вставлено: ${inserted} фото`);
  console.log(`   Всего фото в PG: ${afterCount[0].c}`);
  console.log(`   Ресторанов с фото: ${afterRests[0].c}`);

  await pgDS.destroy();
}

run().catch(err => {
  console.error('❌ Ошибка:', err);
  process.exit(1);
});
