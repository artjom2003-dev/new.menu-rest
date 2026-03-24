/**
 * Universal Menu Scraper Pipeline
 *
 * Strategies (tried in order):
 * 1. Known API patterns (myresto.online, iiko, etc.)
 * 2. Common API endpoint discovery (/api/menu, /api/v1/menu, etc.)
 * 3. Playwright page render + structured extraction
 *
 * Usage:
 *   node scrape-all.mjs                  # Process restaurants with website, no menu
 *   node scrape-all.mjs --with-menu      # Also update existing menus
 *   node scrape-all.mjs --domain=dodopizza.ru  # Only specific domain
 *   node scrape-all.mjs --id=12345       # Only specific restaurant
 *   node scrape-all.mjs --limit=100      # Process max N restaurants
 *   node scrape-all.mjs --dry-run        # Don't write to DB
 */

import pg from 'pg';
import { chromium } from 'playwright';
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';

const { Client } = pg;
const ARGS = process.argv.slice(2);
const flag = (name) => ARGS.some(a => a === `--${name}`);
const param = (name) => { const a = ARGS.find(a => a.startsWith(`--${name}=`)); return a ? a.split('=')[1] : null; };

const DRY_RUN = flag('dry-run');
const WITH_MENU = flag('with-menu');
const ONLY_DOMAIN = param('domain');
const ONLY_ID = param('id');
const LIMIT = parseInt(param('limit') || '50');
const LOG_DIR = './scrape-logs';

if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });

// ─── DB ────────────────────────────────────────────────
const db = new Client({
  host: 'localhost', port: 5432,
  database: 'menurest', user: 'menurest', password: 'menurest_dev_pass',
});

// ─── Known API patterns ────────────────────────────────
const API_STRATEGIES = [
  {
    name: 'myresto.online',
    match: (url) => url.includes('myresto.online'),
    fetch: async (url) => {
      const base = url.replace(/\/ru.*$/, '').replace(/\/$/, '');
      const res = await fetch(`${base}/api/v1/menu`, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(15000) });
      if (!res.ok) return null;
      const data = await res.json();
      const cats = data.result?.itemCategories || [];
      return cats.flatMap(cat => (cat.items || []).map(item => {
        const sz = item.itemSizes?.[0];
        const price = sz?.prices?.[0]?.price;
        const nutr = sz?.nutritionPerHundredGrams;
        const img = sz?.buttonImage?.['508x392x100.webp'] || sz?.buttonImage?.src || null;
        return {
          name: item.name?.trim(),
          description: item.description || null,
          category: cat.name,
          price: Math.round((price || 0) * 100),
          weightGrams: sz?.portionWeightGrams > 1 ? Math.round(sz.portionWeightGrams) : null,
          calories: nutr?.energy || null,
          protein: nutr?.proteins || null,
          fat: nutr?.fats || null,
          carbs: nutr?.carbs || null,
          imageUrl: img,
        };
      })).filter(d => d.name && d.price > 0);
    },
  },
  {
    name: 'iiko-api',
    match: (url) => url.includes('iiko') || url.includes('.menu') || url.includes('restorder'),
    fetch: async (url) => {
      // Try common iiko API patterns
      const base = new URL(url).origin;
      for (const ep of ['/api/menu', '/api/v1/menu', '/api/catalog']) {
        try {
          const res = await fetch(`${base}${ep}`, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(10000) });
          if (res.ok) {
            const data = await res.json();
            if (data.categories || data.menu || data.items) {
              return parseGenericMenuJson(data);
            }
          }
        } catch {}
      }
      return null;
    },
  },
];

// ─── Generic API discovery ─────────────────────────────
async function tryApiDiscovery(websiteUrl) {
  let base;
  try { base = new URL(websiteUrl).origin; } catch { return null; }

  const endpoints = [
    '/api/v1/menu', '/api/menu', '/api/v1/products', '/api/products',
    '/api/catalog', '/api/v1/catalog', '/api/dishes',
    '/api/menu/categories', '/api/v2/menu',
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${base}${ep}`, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('json')) continue;
      const data = await res.json();
      const str = JSON.stringify(data);
      if (str.length < 200) continue; // Too small, probably not menu

      const dishes = parseGenericMenuJson(data);
      if (dishes && dishes.length >= 3) {
        console.log(`    [API] Found menu at ${base}${ep} (${dishes.length} dishes)`);
        return dishes;
      }
    } catch {}
  }
  return null;
}

// ─── Parse generic JSON menu ───────────────────────────
function parseGenericMenuJson(data) {
  const dishes = [];

  // Pattern 1: { categories: [{ name, items: [{ name, price }] }] }
  const cats = data.categories || data.itemCategories || data.menu?.categories || [];
  if (Array.isArray(cats) && cats.length > 0) {
    for (const cat of cats) {
      const items = cat.items || cat.dishes || cat.products || [];
      for (const item of items) {
        dishes.push(parseDishFromJson(item, cat.name || cat.title || 'Другое'));
      }
    }
  }

  // Pattern 2: { items: [{ name, price, category }] }
  if (dishes.length === 0) {
    const items = data.items || data.dishes || data.products || data.payload?.dishes || [];
    if (Array.isArray(items)) {
      for (const item of items) {
        dishes.push(parseDishFromJson(item, item.category?.name || item.categoryName || 'Другое'));
      }
    }
  }

  return dishes.filter(d => d.name && d.price > 0);
}

function parseDishFromJson(item, category) {
  const price = item.price || item.cost || item.prices?.[0]?.price || item.itemSizes?.[0]?.prices?.[0]?.price || 0;
  const weight = item.weight || item.weightGrams || item.portionWeightGrams || item.itemSizes?.[0]?.portionWeightGrams || null;
  const img = item.image || item.imageUrl || item.photo || item.img || item.picture || null;

  return {
    name: (item.name || item.title || '').trim(),
    description: item.description || item.desc || null,
    category: category,
    price: price >= 100 ? Math.round(price) : Math.round(price * 100), // Handle rubles vs kopecks
    weightGrams: weight ? Math.round(parseFloat(weight)) : null,
    calories: item.calories || item.energy || item.kcal || null,
    protein: item.protein || item.proteins || null,
    fat: item.fat || item.fats || null,
    carbs: item.carbs || item.carbohydrates || null,
    imageUrl: typeof img === 'string' ? img : (img?.src || img?.url || null),
  };
}

// ─── Playwright scraper (fallback) ─────────────────────
let browser = null;

async function getBrowser() {
  if (!browser) {
    browser = await chromium.launch({ headless: true });
  }
  return browser;
}

async function scrapeWithPlaywright(websiteUrl) {
  const br = await getBrowser();
  const page = await br.newPage();
  page.setDefaultTimeout(15000);

  const interceptedMenus = [];
  page.on('response', async (response) => {
    const url = response.url();
    const ct = response.headers()['content-type'] || '';
    if (!ct.includes('json')) return;
    // Broad interception — any JSON bigger than 500 bytes
    if (url.includes('menu') || url.includes('product') || url.includes('catalog') || url.includes('dish') || url.includes('item') || url.includes('api')) {
      try {
        const body = await response.json();
        const str = JSON.stringify(body);
        if (str.length > 500) {
          const dishes = parseGenericMenuJson(body);
          if (dishes.length > 0) interceptedMenus.push({ url, dishes });
        }
      } catch {}
    }
  });

  try {
    let base;
    try { base = new URL(websiteUrl).origin; } catch { base = websiteUrl; }

    await page.goto(websiteUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(4000);

    // Step 1: Try navigating to menu page via links
    const menuPaths = ['/menu', '/catalog', '/price', '/menyu', '/eda', '/kitchen'];
    let navigated = false;

    // First try clicking visible menu links
    for (const selector of [
      'a:has-text("Меню")', 'a:has-text("меню")', 'a:has-text("Каталог")',
      'a:has-text("Кухня")', 'a:has-text("Еда")',
      'a[href*="menu"]', 'a[href*="catalog"]', 'a[href*="price"]',
    ]) {
      try {
        const link = page.locator(selector).first();
        if (await link.isVisible({ timeout: 1000 }).catch(() => false)) {
          await link.click();
          await page.waitForTimeout(4000);
          navigated = true;
          break;
        }
      } catch {}
    }

    // If no link found, try direct URL navigation
    if (!navigated) {
      for (const path of menuPaths) {
        try {
          const res = await page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
          if (res && res.status() < 400) {
            await page.waitForTimeout(4000);
            navigated = true;
            break;
          }
        } catch {}
      }
    }

    // Step 2: Scroll to trigger lazy loading
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 1000));
      await page.waitForTimeout(1000);
    }

    // Step 3: Check intercepted API calls
    if (interceptedMenus.length > 0) {
      const best = interceptedMenus.sort((a, b) => b.dishes.length - a.dishes.length)[0];
      console.log(`    [Playwright] Intercepted ${best.dishes.length} dishes from ${best.url.substring(0, 80)}`);
      await page.close();
      return best.dishes;
    }

    // Step 4: Try extracting from page text
    const text = await page.evaluate(() => document.body.innerText);
    if (text.length > 300) {
      const dishes = parseMenuFromText(text);
      if (dishes.length >= 3) {
        console.log(`    [Playwright] Extracted ${dishes.length} dishes from page text`);
        await page.close();
        return dishes;
      }
    }

    await page.close().catch(() => {});
    return null;
  } catch (err) {
    await page.close().catch(() => {});
    return null;
  }
}

// ─── Parse menu from page text ─────────────────────────
function parseMenuFromText(text) {
  const dishes = [];
  // Match lines like: "Dish name ... 590 ₽" or "Dish name 590р" or "Dish name | 590"
  const lines = text.split('\n');
  let currentCategory = 'Другое';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect category headers (ALL CAPS or short bold-like lines)
    if (trimmed.length < 40 && trimmed === trimmed.toUpperCase() && !/\d/.test(trimmed) && trimmed.length > 2) {
      currentCategory = trimmed.charAt(0) + trimmed.slice(1).toLowerCase();
      continue;
    }

    // Try to extract price
    const priceMatch = trimmed.match(/(\d[\d\s]*)\s*[₽рР р\.руб]/);
    if (priceMatch) {
      const price = parseInt(priceMatch[1].replace(/\s/g, ''));
      if (price >= 30 && price <= 50000) {
        const name = trimmed.substring(0, priceMatch.index).replace(/[.\-–—|]+$/, '').trim();
        if (name.length >= 3 && name.length <= 100) {
          // Try to extract weight
          const weightMatch = trimmed.match(/(\d+)\s*(г|гр|ml|мл)/i);
          dishes.push({
            name,
            description: null,
            category: currentCategory,
            price: price * 100,
            weightGrams: weightMatch ? parseInt(weightMatch[1]) : null,
            calories: null, protein: null, fat: null, carbs: null,
            imageUrl: null,
          });
        }
      }
    }
  }
  return dishes;
}

// ─── Normalize category names ──────────────────────────
const CATEGORY_MAP = {
  'гриль': 'Стейки и гриль', 'шашлык': 'Стейки и гриль', 'мангал': 'Стейки и гриль',
  'стейк': 'Стейки и гриль', 'барбекю': 'Стейки и гриль',
  'суп': 'Супы', 'борщ': 'Супы', 'бульон': 'Супы',
  'салат': 'Салаты', 'цезарь': 'Салаты',
  'закуск': 'Закуски', 'антипаст': 'Закуски',
  'горяч': 'Горячее', 'основн': 'Горячее', 'второ': 'Горячее',
  'десерт': 'Десерты', 'сладк': 'Десерты', 'торт': 'Десерты', 'выпечк': 'Десерты',
  'пицц': 'Пицца', 'pizza': 'Пицца',
  'ролл': 'Суши и роллы', 'суши': 'Суши и роллы', 'сашими': 'Суши и роллы',
  'паст': 'Паста', 'спагетт': 'Паста',
  'бургер': 'Бургеры',
  'напит': 'Напитки безалкогольные', 'чай': 'Напитки безалкогольные', 'кофе': 'Напитки безалкогольные',
  'лимонад': 'Напитки безалкогольные', 'сок': 'Напитки безалкогольные',
  'пиво': 'Пиво', 'beer': 'Пиво', 'сидр': 'Пиво',
  'вино': 'Вино', 'wine': 'Вино', 'игрист': 'Вино', 'шампан': 'Вино',
  'коктейл': 'Алкоголь', 'виски': 'Алкоголь', 'водк': 'Алкоголь', 'настойк': 'Алкоголь',
  'коньяк': 'Алкоголь', 'ром': 'Алкоголь', 'джин': 'Алкоголь', 'ликёр': 'Алкоголь',
  'гарнир': 'Гарниры', 'хлеб': 'Хлеб и выпечка', 'лепёшк': 'Хлеб и выпечка',
  'соус': 'Соусы', 'завтрак': 'Завтраки', 'бранч': 'Завтраки',
  'детск': 'Детское меню', 'kids': 'Детское меню',
  'хинкал': 'Горячее', 'хачапур': 'Горячее', 'шаурм': 'Горячее',
  'wok': 'Горячее', 'вок': 'Горячее', 'лапш': 'Горячее',
};

function normalizeCategory(rawName) {
  const lower = (rawName || '').toLowerCase();
  for (const [key, val] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(key)) return val;
  }
  return rawName || 'Другое';
}

// ─── Import dishes to DB ───────────────────────────────
async function importMenu(restaurantId, dishes) {
  if (DRY_RUN) {
    console.log(`    [DRY-RUN] Would import ${dishes.length} dishes for restaurant ${restaurantId}`);
    return;
  }

  // Clear old menu
  await db.query('DELETE FROM restaurant_dishes WHERE restaurant_id = $1', [restaurantId]);

  let order = 0;
  for (const d of dishes) {
    const { rows } = await db.query(
      `INSERT INTO dishes (name, description, weight_grams, calories, protein, fat, carbs, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [d.name, d.description, d.weightGrams, d.calories, d.protein, d.fat, d.carbs, d.imageUrl]
    );
    await db.query(
      `INSERT INTO restaurant_dishes (restaurant_id, dish_id, category_name, price, is_available, sort_order)
       VALUES ($1, $2, $3, $4, true, $5)`,
      [restaurantId, rows[0].id, normalizeCategory(d.category), d.price, order++]
    );
  }
}

// ─── Main pipeline ─────────────────────────────────────
async function main() {
  await db.connect();
  console.log('=== Universal Menu Scraper ===');
  console.log(`Mode: ${DRY_RUN ? 'DRY-RUN' : 'LIVE'}, Limit: ${LIMIT}, WithMenu: ${WITH_MENU}`);

  // Build query
  let query = `
    SELECT r.id, r.slug, r.name, r.address, r.website,
           (SELECT COUNT(*) FROM restaurant_dishes rd WHERE rd.restaurant_id = r.id) as menu_count
    FROM restaurants r
    WHERE r.website IS NOT NULL AND r.website != '' AND r.status = 'published'
  `;
  const params = [];

  if (!WITH_MENU) {
    query += ' AND NOT EXISTS (SELECT 1 FROM restaurant_dishes rd WHERE rd.restaurant_id = r.id)';
  }
  if (ONLY_DOMAIN) {
    params.push(`%${ONLY_DOMAIN}%`);
    query += ` AND r.website ILIKE $${params.length}`;
  }
  if (ONLY_ID) {
    params.push(parseInt(ONLY_ID));
    query += ` AND r.id = $${params.length}`;
  }

  // Prioritize: chains first (more impact), then by name
  query += ' ORDER BY r.name, r.id';
  params.push(LIMIT);
  query += ` LIMIT $${params.length}`;

  const { rows: restaurants } = await db.query(query, params);
  console.log(`Found ${restaurants.length} restaurants to process`);

  // Group by domain to avoid scraping same site N times
  function getDomain(url) {
    try { return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace('www.', ''); } catch { return url; }
  }

  const byDomain = new Map();
  for (const r of restaurants) {
    const domain = getDomain(r.website);
    if (!byDomain.has(domain)) byDomain.set(domain, []);
    byDomain.get(domain).push(r);
  }
  console.log(`Grouped into ${byDomain.size} unique domains\n`);

  const stats = { total: 0, success: 0, failed: 0, skipped: 0, byStrategy: {} };
  const results = [];
  const domainCache = new Map(); // domain → { dishes, strategy } | null

  let domainIdx = 0;
  for (const [domain, group] of byDomain) {
    domainIdx++;
    const representative = group[0];
    const website = representative.website;
    console.log(`[${domainIdx}/${byDomain.size}] ${domain} (${group.length} restaurants, e.g. "${representative.name}")`);

    // Check cache
    let cached = domainCache.get(domain);
    if (cached === undefined) {
      // Scrape once
      try {
        let dishes = null;
        let strategy = null;

        // Strategy 1: Known API patterns
        for (const s of API_STRATEGIES) {
          if (s.match(website)) {
            console.log(`  Trying: ${s.name}`);
            dishes = await s.fetch(website);
            if (dishes?.length > 0) { strategy = s.name; break; }
          }
        }

        // Strategy 2: Generic API discovery
        if (!dishes) {
          console.log('  Trying: API discovery');
          dishes = await tryApiDiscovery(website);
          if (dishes?.length > 0) strategy = 'api-discovery';
        }

        // Strategy 3: Playwright
        if (!dishes) {
          console.log('  Trying: Playwright');
          dishes = await scrapeWithPlaywright(website);
          if (dishes?.length > 0) strategy = 'playwright';
        }

        if (dishes && dishes.length >= 3) {
          cached = { dishes, strategy };
        } else {
          cached = null;
        }
      } catch (err) {
        console.log(`  ✗ Error: ${err.message}`);
        cached = null;
      }
      domainCache.set(domain, cached);
    }

    if (!cached) {
      console.log(`  ✗ No menu found for domain`);
      for (const r of group) { stats.total++; stats.failed++; }
      continue;
    }

    let dishes = cached.dishes;
    const strategy = cached.strategy;

    // Deduplicate and clean
    {
      const seen = new Set();
      dishes = dishes.filter(d => {
        const key = d.name.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      dishes = dishes.filter(d => !d.name.match(/столовые приборы|термопакет|пакет для доставки/i));
    }

    console.log(`  ✓ ${dishes.length} dishes via ${strategy} → applying to ${group.length} branch(es)`);

    // Apply to all restaurants in this domain group
    for (const r of group) {
      stats.total++;
      await importMenu(r.id, dishes);
      stats.success++;
      results.push({ id: r.id, slug: r.slug, name: r.name, dishes: dishes.length, strategy });
    }
    stats.byStrategy[strategy] = (stats.byStrategy[strategy] || 0) + group.length;
  }

  // Cleanup
  if (browser) await browser.close();

  // Report
  console.log('\n=== RESULTS ===');
  console.log(`Total: ${stats.total}, Success: ${stats.success}, Failed: ${stats.failed}`);
  console.log('By strategy:', stats.byStrategy);

  // Save log
  const logFile = `${LOG_DIR}/scrape-${new Date().toISOString().slice(0, 10)}.json`;
  writeFileSync(logFile, JSON.stringify({ stats, results }, null, 2));
  console.log(`Log saved to ${logFile}`);

  await db.end();
}

main().catch(e => { console.error(e); process.exit(1); });
