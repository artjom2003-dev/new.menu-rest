/**
 * scripts/verify.ts
 *
 * Проверка целостности данных и отчёт по количеству строк после миграции.
 *
 * Запуск:
 *   npx ts-node scripts/verify.ts
 *   npx ts-node scripts/verify.ts --json   (вывод в JSON)
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const isJson = process.argv.includes('--json');

function createPgPool(): Pool {
  return new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME     || 'menurest',
    user:     process.env.DB_USER     || 'menurest',
    password: process.env.DB_PASSWORD || '',
  });
}

// ─── Ожидаемые диапазоны строк ────────────────────────────────────────────────

const EXPECTED: Record<string, [number, number]> = {
  cities:               [100,   300],
  cuisines:             [50,    100],
  restaurant_chains:    [0,     500],
  restaurants:          [40000, 62000],
  working_hours:        [50000, 500000],
  restaurant_cuisines:  [50000, 8000000],
  dishes:               [10000, 20000],
  restaurant_dishes:    [10000, 20000],
  photos:               [50000, 200000],
  reviews:              [200,   600],
};

interface CheckResult {
  name:    string;
  count:   number;
  min:     number;
  max:     number;
  status:  'ok' | 'warn' | 'empty';
}

// ─── 1. Счётчики строк ────────────────────────────────────────────────────────

async function countRows(pg: Pool): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  for (const [table, [min, max]] of Object.entries(EXPECTED)) {
    const res = await pg.query(`SELECT COUNT(*) AS cnt FROM ${table}`);
    const count = parseInt(res.rows[0].cnt, 10);
    const status: CheckResult['status'] =
      count === 0          ? 'empty' :
      count < min          ? 'warn'  :
                             'ok';
    results.push({ name: table, count, min, max, status });
  }

  return results;
}

// ─── 2. Проверки целостности ──────────────────────────────────────────────────

interface IntegrityCheck {
  label:  string;
  query:  string;
  expect: number;         // ожидаемое кол-во нарушений (обычно 0)
}

const INTEGRITY_CHECKS: IntegrityCheck[] = [
  {
    label:  'Рестораны без city_id',
    query:  `SELECT COUNT(*) AS cnt FROM restaurants WHERE city_id IS NULL`,
    expect: 0,
  },
  {
    label:  'Рестораны без slug',
    query:  `SELECT COUNT(*) AS cnt FROM restaurants WHERE slug IS NULL OR slug = ''`,
    expect: 0,
  },
  {
    label:  'Рестораны без имени',
    query:  `SELECT COUNT(*) AS cnt FROM restaurants WHERE name IS NULL OR name = ''`,
    expect: 0,
  },
  {
    label:  'Дублирующиеся slug в restaurants',
    query:  `SELECT COUNT(*) AS cnt FROM (
               SELECT slug FROM restaurants GROUP BY slug HAVING COUNT(*) > 1
             ) t`,
    expect: 0,
  },
  {
    label:  'Дублирующиеся slug в cuisines',
    query:  `SELECT COUNT(*) AS cnt FROM (
               SELECT slug FROM cuisines GROUP BY slug HAVING COUNT(*) > 1
             ) t`,
    expect: 0,
  },
  {
    label:  'Блюда без цены (< 0)',
    query:  `SELECT COUNT(*) AS cnt FROM restaurant_dishes WHERE price < 0`,
    expect: 0,
  },
  {
    label:  'Отзывы вне диапазона рейтинга (1-5)',
    query:  `SELECT COUNT(*) AS cnt FROM reviews
             WHERE rating_overall NOT BETWEEN 1 AND 5
               AND rating_overall IS NOT NULL`,
    expect: 0,
  },
  {
    label:  'Фото с пустым URL',
    query:  `SELECT COUNT(*) AS cnt FROM photos WHERE url IS NULL OR url = ''`,
    expect: 0,
  },
  {
    label:  'restaurant_cuisines → несуществующий ресторан',
    query:  `SELECT COUNT(*) AS cnt FROM restaurant_cuisines rc
             LEFT JOIN restaurants r ON r.id = rc.restaurant_id
             WHERE r.id IS NULL`,
    expect: 0,
  },
  {
    label:  'restaurant_dishes → несуществующее блюдо',
    query:  `SELECT COUNT(*) AS cnt FROM restaurant_dishes rd
             LEFT JOIN dishes d ON d.id = rd.dish_id
             WHERE d.id IS NULL`,
    expect: 0,
  },
  {
    label:  'working_hours дублей (restaurant+day)',
    query:  `SELECT COUNT(*) AS cnt FROM (
               SELECT restaurant_id, day_of_week
               FROM working_hours
               GROUP BY restaurant_id, day_of_week
               HAVING COUNT(*) > 1
             ) t`,
    expect: 0,
  },
  {
    label:  'Рестораны без ни одной кухни',
    query:  `SELECT COUNT(*) AS cnt FROM restaurants r
             WHERE r.status = 'published'
               AND NOT EXISTS (
                 SELECT 1 FROM restaurant_cuisines rc
                 WHERE rc.restaurant_id = r.id
               )`,
    expect: -1,  // не 0, это информационный счётчик
  },
  {
    label:  'Рестораны с ratingOverall > 0 но без отзывов',
    query:  `SELECT COUNT(*) AS cnt FROM restaurants r
             WHERE r.rating > 0
               AND NOT EXISTS (
                 SELECT 1 FROM reviews rv
                 WHERE rv.restaurant_id = r.id AND rv.status = 'approved'
               )`,
    expect: 0,
  },
];

interface IntegrityResult {
  label:  string;
  count:  number;
  passed: boolean;        // false = нарушение
  info:   boolean;        // true = информационный (expect = -1)
}

async function runIntegrityChecks(pg: Pool): Promise<IntegrityResult[]> {
  const results: IntegrityResult[] = [];

  for (const check of INTEGRITY_CHECKS) {
    try {
      const res = await pg.query(check.query);
      const count = parseInt(res.rows[0].cnt, 10);
      const info   = check.expect === -1;
      const passed = info ? true : count === check.expect;
      results.push({ label: check.label, count, passed, info });
    } catch (err) {
      results.push({ label: check.label, count: -1, passed: false, info: false });
    }
  }

  return results;
}

// ─── 3. Дополнительная статистика ────────────────────────────────────────────

async function extraStats(pg: Pool): Promise<Record<string, unknown>> {
  const q = async (sql: string): Promise<unknown> => {
    try {
      const res = await pg.query(sql);
      return res.rows;
    } catch {
      return null;
    }
  };

  return {
    top5_cities_by_restaurants: await q(`
      SELECT c.name, COUNT(r.id) AS cnt
      FROM cities c
      JOIN restaurants r ON r.city_id = c.id
      WHERE r.status != 'archived'
      GROUP BY c.name ORDER BY cnt DESC LIMIT 5
    `),
    top5_cuisines: await q(`
      SELECT cu.name, COUNT(rc.restaurant_id) AS cnt
      FROM cuisines cu
      JOIN restaurant_cuisines rc ON rc.cuisine_id = cu.id
      GROUP BY cu.name ORDER BY cnt DESC LIMIT 5
    `),
    price_level_dist: await q(`
      SELECT price_level, COUNT(*) AS cnt
      FROM restaurants
      WHERE price_level IS NOT NULL
      GROUP BY price_level ORDER BY price_level
    `),
    reviews_by_status: await q(`
      SELECT status, COUNT(*) AS cnt
      FROM reviews GROUP BY status ORDER BY status
    `),
    dishes_without_price: await q(`
      SELECT COUNT(*) AS cnt FROM restaurant_dishes WHERE price = 0
    `),
    photos_by_source: await q(`
      SELECT source, COUNT(*) AS cnt FROM photos GROUP BY source
    `),
    restaurants_with_no_photos: await q(`
      SELECT COUNT(*) AS cnt FROM restaurants r
      WHERE NOT EXISTS (SELECT 1 FROM photos p WHERE p.restaurant_id = r.id)
    `),
  };
}

// ─── Форматирование вывода ────────────────────────────────────────────────────

function printReport(
  counts: CheckResult[],
  integrity: IntegrityResult[],
  extra: Record<string, unknown>,
): void {
  const ok    = '\x1b[32m✓\x1b[0m';
  const warn  = '\x1b[33m⚠\x1b[0m';
  const fail  = '\x1b[31m✗\x1b[0m';
  const info  = '\x1b[36mℹ\x1b[0m';

  console.log('\n' + '═'.repeat(62));
  console.log('Menu-Rest — Отчёт по целостности данных');
  console.log('═'.repeat(62));

  // ── Таблица 1: Счётчики строк
  console.log('\n📊 Количество строк по таблицам:\n');
  console.log('  Таблица                   Строк       Ожидание    Статус');
  console.log('  ' + '─'.repeat(58));
  for (const r of counts) {
    const icon   = r.status === 'ok' ? ok : r.status === 'warn' ? warn : fail;
    const count  = String(r.count).padStart(10);
    const range  = `${r.min}–${r.max}`.padEnd(14);
    console.log(`  ${r.name.padEnd(25)} ${count}   ${range} ${icon}`);
  }

  const total = counts.reduce((s, r) => s + r.count, 0);
  console.log(`\n  Итого строк во всех таблицах: ${total.toLocaleString()}`);

  // ── Таблица 2: Проверки целостности
  console.log('\n\n🔍 Проверки целостности данных:\n');
  let violations = 0;
  for (const r of integrity) {
    const icon = r.info ? info : r.passed ? ok : fail;
    const cnt  = r.count >= 0 ? `${r.count} записей` : 'ошибка';
    console.log(`  ${icon} ${r.label}: ${cnt}`);
    if (!r.passed && !r.info) violations++;
  }

  if (violations === 0) {
    console.log(`\n  ${ok} Нарушений целостности не найдено`);
  } else {
    console.log(`\n  ${fail} Найдено нарушений: ${violations}`);
  }

  // ── Дополнительная статистика
  console.log('\n\n📈 Дополнительная статистика:\n');

  if (Array.isArray(extra.top5_cities_by_restaurants)) {
    console.log('  Топ-5 городов по числу ресторанов:');
    for (const row of extra.top5_cities_by_restaurants as any[]) {
      console.log(`    ${row.name.padEnd(25)} ${row.cnt}`);
    }
  }
  if (Array.isArray(extra.top5_cuisines)) {
    console.log('\n  Топ-5 кухонь:');
    for (const row of extra.top5_cuisines as any[]) {
      console.log(`    ${row.name.padEnd(30)} ${row.cnt}`);
    }
  }
  if (Array.isArray(extra.price_level_dist)) {
    console.log('\n  Распределение по ценовому уровню:');
    const icons = ['', '₽', '₽₽', '₽₽₽', '₽₽₽₽'];
    for (const row of extra.price_level_dist as any[]) {
      console.log(`    ${icons[row.price_level]}   ${row.cnt} ресторанов`);
    }
  }
  if (Array.isArray(extra.reviews_by_status)) {
    console.log('\n  Отзывы по статусу:');
    for (const row of extra.reviews_by_status as any[]) {
      console.log(`    ${row.status.padEnd(15)} ${row.cnt}`);
    }
  }
  if (Array.isArray(extra.photos_by_source)) {
    console.log('\n  Фото по источнику:');
    for (const row of extra.photos_by_source as any[]) {
      console.log(`    ${row.source.padEnd(15)} ${row.cnt}`);
    }
  }
  if (extra.restaurants_with_no_photos) {
    const row = (extra.restaurants_with_no_photos as any[])[0];
    console.log(`\n  Рестораны без фотографий: ${row?.cnt ?? '?'}`);
  }

  console.log('\n' + '═'.repeat(62) + '\n');
}

// ─── Точка входа ──────────────────────────────────────────────────────────────

async function main() {
  const pg = createPgPool();

  try {
    await pg.query('SELECT 1');
  } catch (err) {
    console.error('✗ PostgreSQL: ошибка подключения', err);
    process.exit(1);
  }

  const [counts, integrity, extra] = await Promise.all([
    countRows(pg),
    runIntegrityChecks(pg),
    extraStats(pg),
  ]);

  if (isJson) {
    console.log(JSON.stringify({ counts, integrity, extra }, null, 2));
  } else {
    printReport(counts, integrity, extra);
  }

  // Код выхода != 0 если есть нарушения
  const hasViolations = integrity.some(r => !r.passed && !r.info);
  const hasEmptyTables = counts.some(r => r.status === 'empty');

  await pg.end();
  process.exit(hasViolations || hasEmptyTables ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
