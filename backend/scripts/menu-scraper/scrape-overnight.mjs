/**
 * Ночной скрапер меню ресторанов.
 * Обходит рестораны без меню, у которых есть свой сайт.
 * Пропускает restoclub.ru, afisha.ru — там уже были.
 *
 * Запуск: node backend/scripts/menu-scraper/scrape-overnight.mjs [--limit 500] [--offset 0] [--city moscow]
 *
 * Стратегия:
 * 1. Ищет /menu, /menyu, /catalog страницу
 * 2. Если находит JSON API — парсит структуру
 * 3. Если PDF — скачивает и извлекает текст
 * 4. Если HTML — извлекает позиции со страницы
 * 5. Нормализует категории, чистит названия, сохраняет в БД
 */

import pg from 'pg';
import * as cheerio from 'cheerio';
import { chromium } from 'playwright';
import { createWriteStream, mkdirSync, existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

const { Client } = pg;

// ─── Config ───
const args = process.argv.slice(2);
const getArg = (name) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : null; };
const LIMIT = parseInt(getArg('limit') || '1000', 10);
const OFFSET = parseInt(getArg('offset') || '0', 10);
const CITY_FILTER = getArg('city') || null;
const PDF_DIR = resolve('data/raw/menu_pdfs_scraped');
const DELAY_MS = 2000; // Between restaurants
const PAGE_TIMEOUT = 15000;

// Skip these domains — already scraped
const SKIP_DOMAINS = [
  'restoclub.ru', 'afisha.ru', 'resto.ru', 'tripadvisor',
  'yandex.ru', 'google.com', '2gis.ru', 'instagram.com',
  'vk.com', 'facebook.com', 't.me', 'youtube.com',
  'booking.com', 'delivery-club', 'yandex.ru/maps',
];

// Menu page paths to try
const MENU_PATHS = ['/menu', '/menyu', '/catalog', '/price', '/nash-menu', '/nashe-menyu', '/our-menu', '/меню'];

// ─── Category normalization ───
const CATEGORY_MAP = {
  // Салаты
  'салат': 'Салаты', 'salad': 'Салаты',
  // Супы
  'суп': 'Супы', 'soup': 'Супы', 'бульон': 'Супы',
  // Закуски
  'закуск': 'Закуски', 'appetizer': 'Закуски', 'стартер': 'Закуски', 'антипаст': 'Закуски', 'тартар': 'Закуски', 'брускет': 'Закуски',
  // Горячее
  'горяч': 'Горячее', 'основн': 'Горячее', 'main': 'Горячее', 'second': 'Горячее', 'entree': 'Горячее',
  // Мясо/Гриль
  'стейк': 'Стейки и гриль', 'гриль': 'Стейки и гриль', 'мангал': 'Стейки и гриль', 'мяс': 'Стейки и гриль', 'шашлык': 'Стейки и гриль', 'bbq': 'Стейки и гриль',
  // Рыба
  'рыб': 'Рыба и морепродукты', 'морепродукт': 'Рыба и морепродукты', 'seafood': 'Рыба и морепродукты', 'fish': 'Рыба и морепродукты',
  // Паста
  'паста': 'Паста', 'pasta': 'Паста', 'спагетти': 'Паста', 'лазанья': 'Паста',
  // Пицца
  'пицц': 'Пицца', 'pizza': 'Пицца',
  // Суши
  'суши': 'Суши и роллы', 'ролл': 'Суши и роллы', 'sushi': 'Суши и роллы', 'сашими': 'Суши и роллы', 'сет': 'Суши и роллы',
  // Десерты
  'десерт': 'Десерты', 'dessert': 'Десерты', 'сладк': 'Десерты', 'торт': 'Десерты', 'мороженое': 'Десерты', 'выпечк': 'Десерты',
  // Завтраки
  'завтрак': 'Завтраки', 'breakfast': 'Завтраки', 'бранч': 'Завтраки',
  // Гарниры
  'гарнир': 'Гарниры', 'side': 'Гарниры',
  // Соусы
  'соус': 'Соусы', 'sauce': 'Соусы',
  // Хлеб
  'хлеб': 'Хлеб и выпечка', 'bread': 'Хлеб и выпечка', 'лепёшк': 'Хлеб и выпечка', 'лепешк': 'Хлеб и выпечка',
  // Напитки
  'напиток': 'Напитки', 'drink': 'Напитки', 'beverage': 'Напитки', 'безалкоголь': 'Напитки безалкогольные', 'чай': 'Напитки безалкогольные', 'кофе': 'Напитки безалкогольные', 'сок': 'Напитки безалкогольные', 'лимонад': 'Напитки безалкогольные', 'смузи': 'Напитки безалкогольные',
  // Алкоголь
  'алкогол': 'Алкоголь', 'вин': 'Алкоголь', 'пив': 'Алкоголь', 'коктейл': 'Алкоголь', 'виски': 'Алкоголь', 'водк': 'Алкоголь', 'beer': 'Алкоголь', 'wine': 'Алкоголь', 'cocktail': 'Алкоголь',
  // Детское
  'детск': 'Детское меню', 'kids': 'Детское меню', 'child': 'Детское меню',
  // Бизнес-ланч
  'бизнес': 'Бизнес-ланч', 'ланч': 'Бизнес-ланч', 'комплекс': 'Бизнес-ланч',
};

function normalizeCategory(raw) {
  if (!raw) return 'Другое';
  const lower = raw.toLowerCase();
  for (const [key, val] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key)) return val;
  }
  return raw.trim().slice(0, 100);
}

// ─── Dish name cleaning ───
function cleanDishName(name) {
  if (!name) return null;
  let s = name.trim();
  // Remove weight prefix: "110г Мясо" → "Мясо"
  s = s.replace(/^\d+\s*(?:г|гр|мл|ml|g)\s+/i, '');
  // Remove weight suffix: "Мясо 110г" → "Мясо"
  s = s.replace(/\s+\d+\s*(?:г|гр|мл|ml|g)\.?$/i, '');
  // Remove price in name: "Мясо 500₽" or "Мясо 500р"
  s = s.replace(/\s+\d+\s*(?:₽|руб|р\.?)$/i, '');
  // Remove trailing dots
  s = s.replace(/\.+$/, '').trim();
  // Skip junk
  if (s.length < 2 || s.length > 200) return null;
  if (/^\d+$/.test(s)) return null;
  if (/^[*\-—–]+$/.test(s)) return null;
  if (/(?:http|www\.|\.ru|\.com)/i.test(s)) return null;
  if (/(?:доставк|оплат|бронирован|скидк|акци[яи]|промокод)/i.test(s)) return null;
  return s;
}

function extractWeight(text) {
  if (!text) return null;
  const m = text.match(/(\d+)\s*(?:г|гр|g)\b/i);
  return m ? parseInt(m[1], 10) : null;
}

function extractPrice(text) {
  if (!text) return null;
  // "500 ₽", "500р", "500 руб", "500"
  const m = text.match(/(\d[\d\s]*\d|\d+)\s*(?:₽|руб|р\.?|rub)?/i);
  if (!m) return null;
  const price = parseInt(m[1].replace(/\s/g, ''), 10);
  if (price < 10 || price > 100000) return null;
  return price;
}

// ─── DB ───
async function getDb() {
  const c = new Client({ host: 'localhost', port: 5432, database: 'menurest', user: 'menurest', password: 'menurest_dev_pass' });
  await c.connect();
  return c;
}

async function getRestaurantsWithoutMenu(db) {
  let query = `
    SELECT r.id, r.name, r.website, r.slug
    FROM restaurants r
    WHERE r.status = 'published'
      AND r.website IS NOT NULL AND r.website != ''
      AND NOT EXISTS (SELECT 1 FROM restaurant_dishes rd WHERE rd.restaurant_id = r.id)
  `;
  const params = [];
  if (CITY_FILTER) {
    query += ` AND EXISTS (SELECT 1 FROM cities c WHERE c.id = r.city_id AND c.slug = $1)`;
    params.push(CITY_FILTER);
  }
  query += ` ORDER BY r.review_count DESC NULLS LAST LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(LIMIT, OFFSET);

  const result = await db.query(query, params);
  return result.rows;
}

async function saveDishes(db, restaurantId, dishes) {
  let saved = 0;
  for (const d of dishes) {
    const name = cleanDishName(d.name);
    if (!name) continue;

    try {
      // Upsert dish
      const dishRes = await db.query(
        `INSERT INTO dishes (name, description, weight_grams)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [name, d.description || null, d.weightGrams || extractWeight(d.name + ' ' + (d.description || ''))]
      );

      let dishId;
      if (dishRes.rows.length > 0) {
        dishId = dishRes.rows[0].id;
      } else {
        const existing = await db.query('SELECT id FROM dishes WHERE name = $1 LIMIT 1', [name]);
        if (existing.rows.length === 0) continue;
        dishId = existing.rows[0].id;
      }

      // Upsert restaurant_dish link
      const category = normalizeCategory(d.category);
      const price = d.price || 0;

      await db.query(
        `INSERT INTO restaurant_dishes (restaurant_id, dish_id, category_name, price, is_available)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (restaurant_id, dish_id) DO NOTHING`,
        [restaurantId, dishId, category, price]
      );
      saved++;
    } catch (err) {
      // Skip individual dish errors
    }
  }
  return saved;
}

// ─── Scraping strategies ───

function shouldSkipUrl(url) {
  if (!url) return true;
  const lower = url.toLowerCase();
  return SKIP_DOMAINS.some(d => lower.includes(d));
}

function normalizeUrl(url) {
  if (!url) return null;
  url = url.trim();
  if (!url.startsWith('http')) url = 'https://' + url;
  // Remove trailing slash
  url = url.replace(/\/+$/, '');
  return url;
}

// Strategy 1: Fetch HTML and extract menu items
async function scrapeHtml(baseUrl, browser) {
  const dishes = [];
  const page = await browser.newPage();
  page.setDefaultTimeout(PAGE_TIMEOUT);

  try {
    // Try menu pages
    const urlsToTry = [baseUrl, ...MENU_PATHS.map(p => baseUrl + p)];
    let menuPageUrl = null;
    let menuHtml = null;

    for (const url of urlsToTry) {
      try {
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });
        if (!response || response.status() >= 400) continue;

        const html = await page.content();
        // Check if this page has menu-like content
        const hasMenuContent = /(?:меню|menu|catalog|блюд|dish|price|цена|₽|руб)/i.test(html);
        if (hasMenuContent && html.length > 5000) {
          menuPageUrl = url;
          menuHtml = html;
          break;
        }
      } catch { continue; }
    }

    if (!menuHtml) { await page.close(); return []; }

    // Wait for dynamic content
    await page.waitForTimeout(2000);
    menuHtml = await page.content();

    // Try to intercept API calls
    const apiDishes = [];
    page.on('response', async (response) => {
      try {
        const ct = response.headers()['content-type'] || '';
        if (!ct.includes('json')) return;
        const json = await response.json();
        extractDishesFromJson(json, apiDishes);
      } catch {}
    });

    // Scroll to load lazy content
    await autoScroll(page);
    await page.waitForTimeout(1000);

    if (apiDishes.length > 3) {
      await page.close();
      return apiDishes;
    }

    // Parse HTML
    menuHtml = await page.content();
    await page.close();

    const $ = cheerio.load(menuHtml);
    let currentCategory = '';

    // Common menu patterns
    $('[class*="menu"], [class*="catalog"], [class*="dish"], [class*="product"], [class*="item"]').each((_, el) => {
      const $el = $(el);
      const text = $el.text().trim();

      // Category detection
      const $cat = $el.find('[class*="categ"], [class*="title"], [class*="section"], h2, h3');
      if ($cat.length) {
        const catText = $cat.first().text().trim();
        if (catText.length > 1 && catText.length < 80) currentCategory = catText;
      }

      // Dish detection
      const $name = $el.find('[class*="name"], [class*="title"], [class*="dish-name"], [class*="product-name"], h4, h5');
      const $price = $el.find('[class*="price"], [class*="cost"], [class*="rub"]');
      const $desc = $el.find('[class*="desc"], [class*="composition"], [class*="ingredient"]');

      const name = $name.length ? $name.first().text().trim() : '';
      const priceText = $price.length ? $price.first().text().trim() : '';
      const desc = $desc.length ? $desc.first().text().trim() : '';

      if (name && name.length > 1 && name.length < 200) {
        const price = extractPrice(priceText);
        dishes.push({
          name,
          description: desc.length > 3 && desc.length < 500 ? desc : null,
          category: currentCategory || null,
          price: price ? price * 100 : 0, // to kopecks
          weightGrams: extractWeight(text),
        });
      }
    });

    // Fallback: simple regex extraction from text
    if (dishes.length < 3) {
      const fullText = $('body').text();
      const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 3);

      for (const line of lines) {
        const m = line.match(/^(.{3,80})\s+(\d{2,5})\s*(?:₽|руб|р\.?)?$/);
        if (m) {
          const name = cleanDishName(m[1]);
          const price = parseInt(m[2], 10);
          if (name && price > 50 && price < 50000) {
            dishes.push({
              name,
              category: null,
              price: price * 100,
              weightGrams: extractWeight(line),
            });
          }
        }
      }
    }
  } catch (err) {
    // Page error — skip
  }

  try { await page.close(); } catch {}
  return dishes;
}

function extractDishesFromJson(obj, dishes, category = '') {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    for (const item of obj) extractDishesFromJson(item, dishes, category);
    return;
  }

  // Detect category
  const cat = obj.category || obj.categoryName || obj.section || obj.group || obj.groupName || category;

  // Detect dish
  const name = obj.name || obj.title || obj.dishName || obj.productName;
  const price = obj.price || obj.cost || obj.priceValue;

  if (name && typeof name === 'string' && name.length > 1 && name.length < 200) {
    const cleanName = cleanDishName(name);
    if (cleanName) {
      const p = typeof price === 'number' ? price : extractPrice(String(price || ''));
      dishes.push({
        name: cleanName,
        description: obj.description || obj.desc || obj.composition || null,
        category: typeof cat === 'string' ? cat : null,
        price: p ? (p < 500 ? p * 100 : p) : 0, // handle both RUB and kopecks
        weightGrams: obj.weight || obj.weightGrams || extractWeight(name),
      });
    }
  }

  // Recurse into nested structures
  for (const val of Object.values(obj)) {
    if (typeof val === 'object' && val !== null) {
      extractDishesFromJson(val, dishes, typeof cat === 'string' ? cat : category);
    }
  }
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 400;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight || totalHeight > 10000) {
          clearInterval(timer);
          resolve(undefined);
        }
      }, 100);
    });
  });
}

// ─── PDF handling ───
async function downloadAndParsePdf(url) {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok || !resp.body) return [];

    if (!existsSync(PDF_DIR)) mkdirSync(PDF_DIR, { recursive: true });
    const filename = join(PDF_DIR, `menu_${Date.now()}.pdf`);
    await pipeline(Readable.fromWeb(resp.body), createWriteStream(filename));

    // Parse with a simple text extraction (pdfjs or external tool)
    // For now, just mark it as downloaded — the Python pipeline can parse it later
    console.log(`  📄 PDF saved: ${filename}`);
    return []; // Will be parsed by Python pipeline
  } catch {
    return [];
  }
}

// ─── Main ───
async function main() {
  console.log('🌙 Ночной скрапер меню');
  console.log(`   Limit: ${LIMIT}, Offset: ${OFFSET}${CITY_FILTER ? ', City: ' + CITY_FILTER : ''}\n`);

  const db = await getDb();
  const restaurants = await getRestaurantsWithoutMenu(db);
  console.log(`📋 Найдено ${restaurants.length} ресторанов без меню с сайтами\n`);

  if (restaurants.length === 0) {
    await db.end();
    return;
  }

  const browser = await chromium.launch({ headless: true });
  const stats = { processed: 0, scraped: 0, totalDishes: 0, failed: 0, skipped: 0 };

  for (const r of restaurants) {
    stats.processed++;
    const url = normalizeUrl(r.website);
    if (!url || shouldSkipUrl(url)) {
      stats.skipped++;
      continue;
    }

    process.stdout.write(`[${stats.processed}/${restaurants.length}] ${r.name} → ${url} ... `);

    try {
      const dishes = await scrapeHtml(url, browser);

      if (dishes.length >= 3) {
        const saved = await saveDishes(db, r.id, dishes);
        stats.scraped++;
        stats.totalDishes += saved;
        console.log(`✅ ${saved} блюд`);
      } else {
        stats.failed++;
        console.log(`❌ ${dishes.length} (мало)`);
      }
    } catch (err) {
      stats.failed++;
      console.log(`❌ ${err.message?.slice(0, 50)}`);
    }

    // Delay between requests
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  await browser.close();
  await db.end();

  console.log('\n═══ ИТОГИ ═══');
  console.log(`  Обработано: ${stats.processed}`);
  console.log(`  Пропущено (аггрегаторы): ${stats.skipped}`);
  console.log(`  Успешно: ${stats.scraped}`);
  console.log(`  Не удалось: ${stats.failed}`);
  console.log(`  Всего блюд: ${stats.totalDishes}`);
}

main().catch(err => {
  console.error('❌ Fatal:', err);
  process.exit(1);
});
