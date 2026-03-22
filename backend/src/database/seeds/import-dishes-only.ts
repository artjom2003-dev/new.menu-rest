/**
 * Import/update dishes from pipeline.db → PostgreSQL (batch mode).
 * Does NOT touch restaurants, photos, hours — only dishes, menu_categories, restaurant_dishes.
 *
 * Usage:
 *   cd backend && npx ts-node src/database/seeds/import-dishes-only.ts
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as BetterSqlite3 from 'better-sqlite3';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const PIPELINE_DB = path.resolve(__dirname, '../../../../restaurant_pipeline/data/processed/pipeline.db');

const pg = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'menurest',
  username: process.env.DB_USER || 'menurest',
  password: process.env.DB_PASSWORD,
  synchronize: false,
  entities: [],
  extra: {
    connectionTimeoutMillis: 10000,
  },
});

function cleanText(s: string | null): string | null {
  if (!s) return null;
  return s.replace(/\0/g, '').replace(/\s+/g, ' ').trim() || null;
}

async function run() {
  const SqliteDB = (BetterSqlite3 as any).default || BetterSqlite3;
  const sqlite = new SqliteDB(PIPELINE_DB, { readonly: true });
  await pg.initialize();

  console.log('='.repeat(60));
  console.log('  IMPORT DISHES ONLY — BATCH MODE');
  console.log('='.repeat(60));

  // ── Step 1: Get PG restaurant IDs ──
  const pgRestaurants = await pg.query('SELECT id FROM restaurants');
  const pgRestIds = new Set(pgRestaurants.map((r: any) => r.id));
  console.log(`\n[Step 1] PG restaurants: ${pgRestIds.size.toLocaleString()}`);

  // ── Step 2: Get target restaurants ──
  const sqliteRestsWithDishes = sqlite.prepare(`
    SELECT DISTINCT d.restaurant_id as id
    FROM dishes d
    JOIN restaurants r ON r.id = d.restaurant_id
    WHERE r.is_duplicate = 0
  `).all() as { id: number }[];

  const targetIds = sqliteRestsWithDishes
    .map(r => r.id)
    .filter(id => pgRestIds.has(id));

  console.log(`[Step 2] SQLite restaurants with dishes: ${sqliteRestsWithDishes.length.toLocaleString()}`);
  console.log(`         Matched in PG: ${targetIds.length.toLocaleString()}`);

  // ── Step 3: Clear old data with TRUNCATE (instant) ──
  console.log('\n[Step 3] Truncating dish tables...');
  await pg.query('TRUNCATE restaurant_dishes, dishes, menu_categories RESTART IDENTITY CASCADE');
  console.log('  Done.');

  // ── Step 4: Batch import ──
  console.log('\n[Step 4] Importing dishes (batch mode)...');

  const stmtDishes = sqlite.prepare('SELECT * FROM dishes WHERE restaurant_id = ? ORDER BY category, name');

  let totalDishes = 0;
  let totalCategories = 0;
  let restaurantsWithMenu = 0;
  let errors = 0;
  const startTime = Date.now();

  // Process each restaurant, batch-insert its dishes
  for (let idx = 0; idx < targetIds.length; idx++) {
    const restId = targetIds[idx];
    const dishes = stmtDishes.all(restId) as any[];
    if (!dishes.length) continue;

    try {
      // 1) Collect unique categories
      const categoryNames: string[] = [];
      for (const d of dishes) {
        const cat = cleanText((d.category || 'Другое').trim())?.substring(0, 200) || 'Другое';
        if (!categoryNames.includes(cat)) categoryNames.push(cat);
      }

      // 2) Batch insert categories
      const categoryIds: Record<string, number> = {};
      if (categoryNames.length > 0) {
        const catValues: any[] = [];
        const catPlaceholders: string[] = [];
        categoryNames.forEach((name, i) => {
          catPlaceholders.push(`($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`);
          catValues.push(restId, name, i);
        });
        const catResult = await pg.query(
          `INSERT INTO menu_categories (restaurant_id, name, sort_order)
           VALUES ${catPlaceholders.join(',')} RETURNING id, name`,
          catValues,
        );
        for (const row of catResult) {
          categoryIds[row.name] = row.id;
        }
        totalCategories += categoryNames.length;
      }

      // 3) Batch insert dishes (chunks of 50 to stay within PG param limit)
      const DISH_BATCH = 50;
      const insertedDishIds: { id: number; index: number }[] = [];

      for (let di = 0; di < dishes.length; di += DISH_BATCH) {
        const chunk = dishes.slice(di, di + DISH_BATCH);
        const values: any[] = [];
        const placeholders: string[] = [];
        const COLS = 10; // number of columns per row

        chunk.forEach((d, i) => {
          const offset = i * COLS;
          placeholders.push(
            `($${offset + 1},$${offset + 2},$${offset + 3},$${offset + 4},$${offset + 5},` +
            `$${offset + 6},$${offset + 7},$${offset + 8},$${offset + 9},$${offset + 10})`
          );
          values.push(
            cleanText(d.name)?.substring(0, 300) || 'Без названия',
            cleanText(d.description),
            cleanText(d.composition),
            d.calories || null,
            d.protein || null,
            d.fat || null,
            d.carbs || null,
            d.weight ? parseInt(d.weight) || null : null,
            d.photo_url || null,
            d.is_healthy_choice === 1,
          );
        });

        const result = await pg.query(
          `INSERT INTO dishes (name, description, composition, calories, protein, fat, carbs,
                               weight_grams, image_url, is_healthy_choice)
           VALUES ${placeholders.join(',')} RETURNING id`,
          values,
        );

        for (let j = 0; j < result.length; j++) {
          insertedDishIds.push({ id: result[j].id, index: di + j });
        }
      }

      // 4) Batch insert restaurant_dishes links
      const RD_BATCH = 50;
      for (let ri = 0; ri < insertedDishIds.length; ri += RD_BATCH) {
        const chunk = insertedDishIds.slice(ri, ri + RD_BATCH);
        const values: any[] = [];
        const placeholders: string[] = [];
        const COLS = 7;

        chunk.forEach(({ id: dishId, index: dishIndex }, i) => {
          const d = dishes[dishIndex];
          const categoryName = cleanText((d.category || 'Другое').trim())?.substring(0, 200) || 'Другое';
          const catId = categoryIds[categoryName] || Object.values(categoryIds)[0];
          const rawPrice = d.price ? Math.round(d.price * 100) : 0;
          const priceKopeks = Math.min(Math.max(rawPrice, 0), 10000000);
          const offset = i * COLS;

          placeholders.push(
            `($${offset + 1},$${offset + 2},$${offset + 3},$${offset + 4},$${offset + 5},$${offset + 6},$${offset + 7})`
          );
          values.push(restId, dishId, catId, categoryName, priceKopeks, true, dishIndex);
        });

        await pg.query(
          `INSERT INTO restaurant_dishes (restaurant_id, dish_id, menu_category_id, category_name, price, is_available, sort_order)
           VALUES ${placeholders.join(',')} ON CONFLICT DO NOTHING`,
          values,
        );
      }

      totalDishes += insertedDishIds.length;
      restaurantsWithMenu++;

    } catch (err: any) {
      errors++;
      if (errors <= 10) {
        console.warn(`  [!] Error rest=${restId}: ${err.message.substring(0, 150)}`);
      }
    }

    if ((idx + 1) % 500 === 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = (idx + 1) / elapsed;
      const eta = (targetIds.length - idx - 1) / rate;
      console.log(
        `  ${(idx + 1).toLocaleString()}/${targetIds.length.toLocaleString()} restaurants | ` +
        `${totalDishes.toLocaleString()} dishes | ` +
        `${rate.toFixed(1)} rest/s | ETA: ${(eta / 60).toFixed(0)}min`
      );
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

  console.log('\n' + '='.repeat(60));
  console.log('  IMPORT DISHES COMPLETE');
  console.log('='.repeat(60));
  console.log(`  Restaurants with menu: ${restaurantsWithMenu.toLocaleString()}`);
  console.log(`  Dishes imported:       ${totalDishes.toLocaleString()}`);
  console.log(`  Menu categories:       ${totalCategories.toLocaleString()}`);
  console.log(`  Errors:                ${errors}`);
  console.log(`  Time:                  ${totalTime} min`);

  sqlite.close();
  await pg.destroy();
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
