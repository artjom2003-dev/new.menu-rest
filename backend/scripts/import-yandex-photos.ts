/**
 * Импорт yandex-фото из pipeline.db → PostgreSQL.
 * Матчинг по slug, legacy_id, name+city.
 *
 * Запуск: cd backend && npx ts-node scripts/import-yandex-photos.ts
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

async function run() {
  await pgDS.initialize();
  console.log('🔌 PostgreSQL connected');

  const sqlite = new Database(PIPELINE_DB, { readonly: true });
  console.log('🔌 Pipeline.db connected\n');

  // 1. Yandex photos from pipeline
  const yandexPhotos = sqlite.prepare(`
    SELECT p.restaurant_id, p.url, p.is_primary, r.slug, r.name, r.city, r.legacy_id
    FROM photos p
    JOIN restaurants r ON r.id = p.restaurant_id AND r.is_duplicate = 0
    WHERE p.source = 'yandex' AND p.url LIKE 'http%'
  `).all() as Array<{
    restaurant_id: number; url: string; is_primary: number;
    slug: string; name: string; city: string | null; legacy_id: number | null;
  }>;

  console.log(`📸 Yandex-фото в pipeline: ${yandexPhotos.length}`);

  // 2. PG restaurants
  console.log('  Loading PG restaurants...');
  const pgRests: Array<{ id: number; name: string; legacy_id: number | null; slug: string; city_name: string | null }> =
    await pgDS.query(`
      SELECT r.id, r.name, r.legacy_id, r.slug, c.name as city_name
      FROM restaurants r LEFT JOIN cities c ON c.id = r.city_id
      WHERE r.status = 'published'
    `);

  const pgBySlug = new Map(pgRests.map(r => [r.slug, r]));
  const pgByLegacyId = new Map<number, typeof pgRests[0]>();
  const pgByNameCity = new Map<string, typeof pgRests[0]>();
  for (const r of pgRests) {
    if (r.legacy_id) pgByLegacyId.set(r.legacy_id, r);
    const key = `${r.name.toLowerCase().trim()}|||${(r.city_name || '').toLowerCase().trim()}`;
    if (!pgByNameCity.has(key)) pgByNameCity.set(key, r);
  }

  // 3. Existing URLs
  console.log('  Loading existing URLs...');
  const existingUrls = new Set<string>();
  const urlRows: Array<{ url: string }> = await pgDS.query('SELECT url FROM photos');
  for (const r of urlRows) existingUrls.add(r.url);
  console.log(`  PG: ${pgRests.length} restaurants, ${existingUrls.size} photo URLs\n`);

  sqlite.close();

  // 4. Resolve PG restaurant_id for each photo
  // Cache pipeline restaurant_id → PG restaurant_id
  const resolveCache = new Map<number, number | null>();

  function resolve(photo: typeof yandexPhotos[0]): number | null {
    if (resolveCache.has(photo.restaurant_id)) return resolveCache.get(photo.restaurant_id)!;

    let pg = pgBySlug.get(photo.slug);
    if (!pg && photo.legacy_id) pg = pgByLegacyId.get(photo.legacy_id);
    if (!pg) {
      const key = `${photo.name.toLowerCase().trim()}|||${(photo.city || '').toLowerCase().trim()}`;
      pg = pgByNameCity.get(key);
    }

    const pgId = pg ? pg.id : null;
    resolveCache.set(photo.restaurant_id, pgId);
    return pgId;
  }

  // 5. Build insert list
  const toInsert: Array<{ pg_id: number; url: string; is_cover: boolean }> = [];
  let noMatch = 0;
  let dupeUrl = 0;

  for (const p of yandexPhotos) {
    if (existingUrls.has(p.url)) { dupeUrl++; continue; }
    const pgId = resolve(p);
    if (!pgId) { noMatch++; continue; }
    toInsert.push({ pg_id: pgId, url: p.url, is_cover: p.is_primary === 1 });
    existingUrls.add(p.url);
  }

  console.log(`📋 К вставке: ${toInsert.length} фото`);
  console.log(`   Дубли URL: ${dupeUrl}, Не найдено в PG: ${noMatch}\n`);

  if (toInsert.length === 0) {
    console.log('✅ Нечего импортировать.');
    await pgDS.destroy();
    return;
  }

  // 6. Batch insert
  let inserted = 0;
  const BATCH = 500;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH);
    const values = batch.map((_, j) => `($${j * 3 + 1}, $${j * 3 + 2}, $${j * 3 + 3})`).join(',');
    const params = batch.flatMap(p => [p.pg_id, p.url, p.is_cover]);
    try {
      await pgDS.query(
        `INSERT INTO photos (restaurant_id, url, is_cover) VALUES ${values} ON CONFLICT DO NOTHING`,
        params,
      );
      inserted += batch.length;
    } catch (err: any) {
      // Fallback: insert one by one
      for (const p of batch) {
        try {
          await pgDS.query(
            'INSERT INTO photos (restaurant_id, url, is_cover) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
            [p.pg_id, p.url, p.is_cover],
          );
          inserted++;
        } catch { /* skip */ }
      }
    }
    if ((i + BATCH) % 5000 === 0 || i + BATCH >= toInsert.length) {
      console.log(`  Inserted: ${inserted}/${toInsert.length}`);
    }
  }

  const afterCount = await pgDS.query('SELECT COUNT(*) as c FROM photos');
  const afterRests = await pgDS.query('SELECT COUNT(DISTINCT restaurant_id) as c FROM photos');
  console.log(`\n✅ Готово! Вставлено: ${inserted}`);
  console.log(`   Всего фото в PG: ${afterCount[0].c}`);
  console.log(`   Ресторанов с фото: ${afterRests[0].c}`);

  await pgDS.destroy();
}

run().catch(err => { console.error('❌', err); process.exit(1); });
