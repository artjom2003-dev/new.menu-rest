/**
 * scripts/legacy-import.ts
 *
 * Импорт данных из legacy БД Menu-Rest → новая схема PostgreSQL
 *
 * Запуск:
 *   ts-node scripts/legacy-import.ts
 *   ts-node scripts/legacy-import.ts --dry-run  (без записи в БД)
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import slugify from 'slugify';

dotenv.config();

// ─── Подключение к legacy БД ──────────────────────────────
const legacyDs = new DataSource({
  type: 'postgres',
  host: process.env.LEGACY_DB_HOST,
  port: Number(process.env.LEGACY_DB_PORT) || 5432,
  database: process.env.LEGACY_DB_NAME,
  username: process.env.LEGACY_DB_USER,
  password: process.env.LEGACY_DB_PASSWORD,
  synchronize: false,
  entities: [],
});

// ─── Подключение к новой БД ──────────────────────────────
const newDs = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'menurest',
  username: process.env.DB_USER || 'menurest',
  password: process.env.DB_PASSWORD,
  synchronize: false,
  entities: [__dirname + '/../backend/src/database/entities/*.entity{.ts,.js}'],
});

const isDryRun = process.argv.includes('--dry-run');

interface ImportStats {
  restaurants: { imported: number; skipped: number; errors: number };
  dishes: { imported: number; skipped: number; errors: number };
  photos: { imported: number; skipped: number; errors: number };
}

const stats: ImportStats = {
  restaurants: { imported: 0, skipped: 0, errors: 0 },
  dishes: { imported: 0, skipped: 0, errors: 0 },
  photos: { imported: 0, skipped: 0, errors: 0 },
};

function makeSlug(name: string): string {
  return slugify(name, { lower: true, strict: true, locale: 'ru' });
}

async function importRestaurants() {
  console.log('\n📦 Импорт ресторанов...');

  // TODO: адаптировать под реальную схему legacy БД
  // Структуру узнать из: git.nintegra.ru/MenuRest/MenuRestWeb.git
  const legacyRestaurants = await legacyDs.query(`
    SELECT * FROM restaurants
    WHERE is_active = true
    ORDER BY id
  `).catch(() => {
    console.warn('  ⚠️  Таблица restaurants не найдена, пробуем alternative...');
    return legacyDs.query('SELECT * FROM restaurant ORDER BY id');
  });

  const restRepo = newDs.getRepository('restaurants');
  const snapshotRepo = newDs.getRepository('restaurant_source_snapshots');

  // Получить или создать source
  const sourceRepo = newDs.getRepository('import_sources');
  let source = await sourceRepo.findOneBy({ source_name: 'legacy_menu_rest' });
  if (!source && !isDryRun) {
    source = await sourceRepo.save({
      source_name: 'legacy_menu_rest',
      source_url: process.env.LEGACY_DB_HOST,
      last_import_at: new Date(),
    });
  }

  for (const legacyRest of legacyRestaurants) {
    try {
      const name = legacyRest.name || legacyRest.title || legacyRest.restaurant_name;
      if (!name) { stats.restaurants.skipped++; continue; }

      let slug = makeSlug(name);

      // Проверка на дублирование (idempotent)
      const existing = await restRepo.findOneBy({ slug });
      if (existing) {
        stats.restaurants.skipped++;
        continue;
      }

      // Маппинг полей
      const restaurant = {
        slug,
        name,
        shortDescription: legacyRest.description || legacyRest.short_description || null,
        longDescription: legacyRest.long_description || null,
        priceLevel: legacyRest.price_level || null,
        averageBillMin: legacyRest.average_bill_min || legacyRest.min_price || null,
        averageBillMax: legacyRest.average_bill_max || legacyRest.max_price || null,
        status: 'draft' as const,
        isVerified: false,
      };

      if (!isDryRun) {
        const saved = await restRepo.save(restaurant);

        // Snapshot для аудита
        await snapshotRepo.save({
          restaurant_id: saved.id,
          source_id: source?.id,
          external_id: String(legacyRest.id),
          raw_data: legacyRest,
          imported_at: new Date(),
        });
      }

      stats.restaurants.imported++;
      process.stdout.write('.');

    } catch (err) {
      stats.restaurants.errors++;
      console.error(`\n  ❌ Ресторан ${legacyRest.id}:`, err);
    }
  }

  console.log(`\n  ✅ Рестораны: импортировано ${stats.restaurants.imported}, пропущено ${stats.restaurants.skipped}, ошибок ${stats.restaurants.errors}`);
}

async function importDishes() {
  console.log('\n🍽️  Импорт блюд...');

  // TODO: адаптировать под реальную схему legacy
  let legacyDishes: unknown[] = [];
  try {
    legacyDishes = await legacyDs.query('SELECT * FROM menu_items ORDER BY restaurant_id, id');
  } catch {
    try {
      legacyDishes = await legacyDs.query('SELECT * FROM dishes ORDER BY id');
    } catch {
      console.warn('  ⚠️  Таблица блюд не найдена, пропускаем');
      return;
    }
  }

  const dishRepo = newDs.getRepository('dishes');
  const restRepo = newDs.getRepository('restaurants');

  for (const legacyDish of legacyDishes as Record<string, unknown>[]) {
    try {
      // Найти соответствующий ресторан по external_id
      const snapshot = await newDs.getRepository('restaurant_source_snapshots')
        .findOneBy({ external_id: String(legacyDish.restaurant_id) });

      if (!snapshot) { stats.dishes.skipped++; continue; }

      const restaurant = await restRepo.findOneBy({ id: snapshot.restaurant_id });
      if (!restaurant) { stats.dishes.skipped++; continue; }

      const price = typeof legacyDish.price === 'number'
        ? legacyDish.price * 100  // рубли → копейки
        : Number(legacyDish.price) * 100;

      const dish = {
        restaurant_id: restaurant.id,
        name: legacyDish.name || legacyDish.title,
        description: legacyDish.description || null,
        price: Math.round(price),
        calories: legacyDish.calories || null,
        protein: legacyDish.protein || null,
        fat: legacyDish.fat || null,
        carbs: legacyDish.carbs || legacyDish.carbohydrates || null,
        is_available: true,
      };

      if (!isDryRun) {
        await dishRepo.save(dish);
      }

      stats.dishes.imported++;

    } catch (err) {
      stats.dishes.errors++;
    }
  }

  console.log(`  ✅ Блюда: импортировано ${stats.dishes.imported}, пропущено ${stats.dishes.skipped}, ошибок ${stats.dishes.errors}`);
}

async function run() {
  console.log(`\n🚀 Menu-Rest Legacy Import ${isDryRun ? '(DRY RUN)' : ''}`);
  console.log('='.repeat(50));

  try {
    await legacyDs.initialize();
    console.log('✅ Legacy БД: подключено');
  } catch (err) {
    console.error('❌ Не удалось подключиться к legacy БД:', err);
    process.exit(1);
  }

  try {
    await newDs.initialize();
    console.log('✅ Новая БД: подключено');
  } catch (err) {
    console.error('❌ Не удалось подключиться к новой БД:', err);
    process.exit(1);
  }

  await importRestaurants();
  await importDishes();

  console.log('\n' + '='.repeat(50));
  console.log('📊 Итого:');
  console.log(`  Рестораны: ${stats.restaurants.imported} импортировано`);
  console.log(`  Блюда:     ${stats.dishes.imported} импортировано`);
  console.log(`  Фото:      ${stats.photos.imported} импортировано`);

  if (isDryRun) {
    console.log('\n⚠️  DRY RUN — данные НЕ сохранены');
  }

  await legacyDs.destroy();
  await newDs.destroy();
  console.log('\n✅ Импорт завершён!');
}

run().catch((err) => {
  console.error('❌ Fatal:', err);
  process.exit(1);
});
