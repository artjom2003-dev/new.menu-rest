/**
 * Импорт данных Яндекс Карт из pipeline.db → PostgreSQL:
 *   1. Часы работы (yandex_hours_raw → working_hours)
 *   2. Закрытые рестораны (yandex_closed → status='closed')
 *   3. Фото — ТОЛЬКО для ресторанов без фото в PG
 *
 * Запуск: cd backend && npx ts-node scripts/import-yandex-data.ts
 *   --only hours|closed|photos   (выполнить только один шаг)
 *   --dry-run                    (не писать в PG)
 */
import 'reflect-metadata';
import * as path from 'path';
import * as dotenv from 'dotenv';
import Database = require('better-sqlite3');
import { DataSource } from 'typeorm';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PIPELINE_DB = path.resolve(__dirname, '../../restaurant_pipeline/data/processed/pipeline.db');
const BATCH = 500;

const args = process.argv.slice(2);
const onlyStep = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const dryRun = args.includes('--dry-run');

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

// ─── Matching helpers ──────────────────────────────────────────────────────

interface PgRest {
  id: number;
  name: string;
  legacy_id: number | null;
  slug: string;
  city_name: string | null;
}

let pgBySlug: Map<string, PgRest>;
let pgByLegacyId: Map<number, PgRest>;
let pgByNameCity: Map<string, PgRest>;

async function loadPgRestaurants() {
  const pgRests: PgRest[] = await pgDS.query(`
    SELECT r.id, r.name, r.legacy_id, r.slug, c.name as city_name
    FROM restaurants r LEFT JOIN cities c ON c.id = r.city_id
  `);

  pgBySlug = new Map(pgRests.map(r => [r.slug, r]));
  pgByLegacyId = new Map<number, PgRest>();
  pgByNameCity = new Map<string, PgRest>();
  for (const r of pgRests) {
    if (r.legacy_id) pgByLegacyId.set(r.legacy_id, r);
    const key = `${r.name.toLowerCase().trim()}|||${(r.city_name || '').toLowerCase().trim()}`;
    if (!pgByNameCity.has(key)) pgByNameCity.set(key, r);
  }

  console.log(`  PG restaurants loaded: ${pgRests.length}`);
  return pgRests;
}

const resolveCache = new Map<number, number | null>();

function resolve(pipelineId: number, slug: string, name: string, city: string | null, legacyId: number | null): number | null {
  if (resolveCache.has(pipelineId)) return resolveCache.get(pipelineId)!;

  let pg = pgBySlug.get(slug);
  if (!pg && legacyId) pg = pgByLegacyId.get(legacyId);
  if (!pg) {
    const key = `${name.toLowerCase().trim()}|||${(city || '').toLowerCase().trim()}`;
    pg = pgByNameCity.get(key);
  }

  const pgId = pg ? pg.id : null;
  resolveCache.set(pipelineId, pgId);
  return pgId;
}

// ─── Step 1: Working Hours ─────────────────────────────────────────────────

async function importHours(sqlite: InstanceType<typeof Database>) {
  console.log('\n═══ STEP 1: Working Hours ═══');

  const rows = sqlite.prepare(`
    SELECT id, slug, name, city, legacy_id, yandex_hours_raw
    FROM restaurants
    WHERE yandex_hours_raw IS NOT NULL AND yandex_hours_raw != ''
      AND is_duplicate = 0 AND yandex_closed = 0
  `).all() as Array<{
    id: number; slug: string; name: string; city: string | null;
    legacy_id: number | null; yandex_hours_raw: string;
  }>;

  console.log(`  Restaurants with yandex hours: ${rows.length}`);

  let matched = 0, noMatch = 0, upserted = 0, errors = 0;

  for (const row of rows) {
    const pgId = resolve(row.id, row.slug, row.name, row.city, row.legacy_id);
    if (!pgId) { noMatch++; continue; }
    matched++;

    let hours: Array<{ day: number; open: string; close: string; is_closed: boolean }>;
    try {
      hours = JSON.parse(row.yandex_hours_raw);
    } catch { errors++; continue; }

    if (!Array.isArray(hours) || hours.length === 0) continue;

    if (dryRun) continue;

    // Delete existing hours for this restaurant, then insert new
    try {
      await pgDS.query('DELETE FROM working_hours WHERE restaurant_id = $1', [pgId]);
      for (const h of hours) {
        await pgDS.query(
          `INSERT INTO working_hours (restaurant_id, day_of_week, open_time, close_time, is_closed)
           VALUES ($1, $2, $3, $4, $5)`,
          [pgId, h.day, h.is_closed ? null : h.open, h.is_closed ? null : h.close, h.is_closed],
        );
        upserted++;
      }
    } catch (err: any) {
      errors++;
    }

    if (matched % 2000 === 0) {
      console.log(`  Progress: ${matched}/${rows.length} matched, ${upserted} rows upserted`);
    }
  }

  console.log(`  Done: ${matched} matched, ${noMatch} not found in PG, ${upserted} hour rows, ${errors} errors`);
}

// ─── Step 2: Closed Restaurants ────────────────────────────────────────────

async function markClosed(sqlite: InstanceType<typeof Database>) {
  console.log('\n═══ STEP 2: Closed Restaurants ═══');

  const rows = sqlite.prepare(`
    SELECT id, slug, name, city, legacy_id
    FROM restaurants
    WHERE yandex_closed = 1 AND is_duplicate = 0
  `).all() as Array<{
    id: number; slug: string; name: string; city: string | null; legacy_id: number | null;
  }>;

  console.log(`  Closed in pipeline: ${rows.length}`);

  let matched = 0, noMatch = 0, updated = 0;

  const pgIds: number[] = [];
  for (const row of rows) {
    const pgId = resolve(row.id, row.slug, row.name, row.city, row.legacy_id);
    if (!pgId) { noMatch++; continue; }
    matched++;
    pgIds.push(pgId);
  }

  if (!dryRun && pgIds.length > 0) {
    // Batch update in chunks
    for (let i = 0; i < pgIds.length; i += BATCH) {
      const chunk = pgIds.slice(i, i + BATCH);
      const placeholders = chunk.map((_, j) => `$${j + 1}`).join(',');
      const result = await pgDS.query(
        `UPDATE restaurants SET status = 'closed' WHERE id IN (${placeholders}) AND status != 'closed'`,
        chunk,
      );
      updated += result[1] || 0;
    }
  }

  console.log(`  Done: ${matched} matched, ${noMatch} not found, ${updated} newly marked closed`);
}

// ─── Step 3: Photos (only for restaurants without photos) ──────────────────

async function importPhotos(sqlite: InstanceType<typeof Database>) {
  console.log('\n═══ STEP 3: Photos (only restaurants without photos) ═══');

  // Find PG restaurants that have NO photos
  const restsWithPhotos: Array<{ restaurant_id: number }> = await pgDS.query(
    'SELECT DISTINCT restaurant_id FROM photos',
  );
  const hasPhotos = new Set(restsWithPhotos.map(r => r.restaurant_id));
  console.log(`  PG restaurants with photos: ${hasPhotos.size}`);

  // Get existing URLs to avoid dupes
  const urlRows: Array<{ url: string }> = await pgDS.query('SELECT url FROM photos');
  const existingUrls = new Set(urlRows.map(r => r.url));
  console.log(`  Existing photo URLs: ${existingUrls.size}`);

  // Load yandex photos from pipeline
  const yandexPhotos = sqlite.prepare(`
    SELECT p.restaurant_id, p.url, p.is_primary, r.slug, r.name, r.city, r.legacy_id
    FROM photos p
    JOIN restaurants r ON r.id = p.restaurant_id AND r.is_duplicate = 0
    WHERE p.source = 'yandex' AND p.url LIKE 'http%'
  `).all() as Array<{
    restaurant_id: number; url: string; is_primary: number;
    slug: string; name: string; city: string | null; legacy_id: number | null;
  }>;

  console.log(`  Yandex photos in pipeline: ${yandexPhotos.length}`);

  const toInsert: Array<{ pg_id: number; url: string; is_cover: boolean }> = [];
  let noMatch = 0, dupeUrl = 0, skippedHasPhotos = 0;

  for (const p of yandexPhotos) {
    if (existingUrls.has(p.url)) { dupeUrl++; continue; }
    const pgId = resolve(p.restaurant_id, p.slug, p.name, p.city, p.legacy_id);
    if (!pgId) { noMatch++; continue; }

    // Only add if this restaurant has NO photos in PG
    if (hasPhotos.has(pgId)) { skippedHasPhotos++; continue; }

    toInsert.push({ pg_id: pgId, url: p.url, is_cover: p.is_primary === 1 });
    existingUrls.add(p.url);
  }

  const uniqueRests = new Set(toInsert.map(p => p.pg_id)).size;
  console.log(`  To insert: ${toInsert.length} photos for ${uniqueRests} restaurants`);
  console.log(`  Skipped: ${skippedHasPhotos} (already have photos), ${dupeUrl} (dupe URL), ${noMatch} (no PG match)`);

  if (dryRun || toInsert.length === 0) {
    console.log(dryRun ? '  DRY RUN — nothing written' : '  Nothing to import');
    return;
  }

  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH);
    const values = batch.map((_, j) => `($${j * 4 + 1}, $${j * 4 + 2}, $${j * 4 + 3}, $${j * 4 + 4})`).join(',');
    const params = batch.flatMap(p => [p.pg_id, p.url, p.is_cover, 'yandex']);
    try {
      await pgDS.query(
        `INSERT INTO photos (restaurant_id, url, is_cover, source) VALUES ${values} ON CONFLICT DO NOTHING`,
        params,
      );
      inserted += batch.length;
    } catch {
      for (const p of batch) {
        try {
          await pgDS.query(
            'INSERT INTO photos (restaurant_id, url, is_cover, source) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
            [p.pg_id, p.url, p.is_cover, 'yandex'],
          );
          inserted++;
        } catch { /* skip */ }
      }
    }
    if ((i + BATCH) % 5000 === 0 || i + BATCH >= toInsert.length) {
      console.log(`  Inserted: ${inserted}/${toInsert.length}`);
    }
  }

  console.log(`  Done: ${inserted} photos inserted for ${uniqueRests} restaurants`);
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function run() {
  console.log('🔌 Connecting...');
  await pgDS.initialize();
  console.log('  PostgreSQL OK');

  const sqlite = new Database(PIPELINE_DB, { readonly: true });
  console.log('  Pipeline.db OK');

  await loadPgRestaurants();

  if (dryRun) console.log('\n⚠️  DRY RUN MODE — no changes will be written\n');

  if (!onlyStep || onlyStep === 'hours') await importHours(sqlite);
  if (!onlyStep || onlyStep === 'closed') await markClosed(sqlite);
  if (!onlyStep || onlyStep === 'photos') await importPhotos(sqlite);

  sqlite.close();

  // Final stats
  console.log('\n═══ FINAL PG STATS ═══');
  const hoursCount = await pgDS.query('SELECT COUNT(DISTINCT restaurant_id) as c FROM working_hours');
  const closedCount = await pgDS.query("SELECT COUNT(*) as c FROM restaurants WHERE status = 'closed'");
  const photoCount = await pgDS.query('SELECT COUNT(*) as c FROM photos');
  const photoRests = await pgDS.query('SELECT COUNT(DISTINCT restaurant_id) as c FROM photos');
  console.log(`  Restaurants with hours: ${hoursCount[0].c}`);
  console.log(`  Closed restaurants: ${closedCount[0].c}`);
  console.log(`  Total photos: ${photoCount[0].c}`);
  console.log(`  Restaurants with photos: ${photoRests[0].c}`);

  await pgDS.destroy();
  console.log('\n✅ All done!');
}

run().catch(err => { console.error('❌', err); process.exit(1); });
