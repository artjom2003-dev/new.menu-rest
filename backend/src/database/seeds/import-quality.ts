import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as BetterSqlite3 from 'better-sqlite3';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const PIPELINE_DB = path.resolve(__dirname, '../../../../restaurant_pipeline/data/processed/pipeline.db');

// Hand-picked restaurants with photos + dishes + descriptions
const TARGET_IDS = [
  51423, // Манго — 11 photos, 713 dishes, Москва
  47434, // Виктория — 56 photos, 379 dishes, Москва
  47530, // MyPlace — 19 photos, 246 dishes, Москва
  47527, // В темноте?! — 22 photos, 224 dishes, Москва
  47730, // RestoBar — 9 photos, 173 dishes, Москва
  44846, // Попугай — 7 photos, 157 dishes, СПб
  46043, // Кеци — 35 photos, 141 dishes, Москва
  49792, // 360 — 14 photos, 114 dishes, Москва-Сити
  46275, // Whisky Rooms — 16 photos, 47 dishes, Москва
  51511, // Тхали и Карри — 9 photos, 11 dishes, Москва
];

const CITY_MAP: Record<string, string> = {
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
};

// Better descriptions for our featured restaurants
const DESCRIPTIONS: Record<number, string> = {
  51423: 'Ресторан «Манго» у метро Преображенская площадь. Уютная атмосфера, разнообразная кухня — от бизнес-ланчей до банкетного меню. Салаты, горячие закуски, главные блюда, десерты.',
  47434: 'Ресторан «Виктория» на Рязанском проспекте — классическая европейская и русская кухня. Банкетный зал, бизнес-ланчи, живая музыка по выходным.',
  47530: 'MyPlace — уютный ресторан на Щепкина. Авторская кухня, крафтовые коктейли и камерная атмосфера в самом центре Москвы.',
  47527: 'Ресторан «В темноте?!» — уникальный опыт ужина в полной темноте. Вас обслуживают незрячие официанты, а блюда остаются сюрпризом до конца вечера.',
  47730: 'RestoBar на Пресненской набережной — современный ресторан с видом на Москва-Сити. Европейская кухня, авторские коктейли, бизнес-ланчи.',
  44846: 'Ресторан «Попугай» на Загородном проспекте в Санкт-Петербурге. Разнообразная кухня, тёплая атмосфера, удобное расположение у метро.',
  46043: 'Кеци — грузинский ресторан в Измайлово. Настоящие хинкали, хачапури, шашлык на углях. Живая музыка и гостеприимная атмосфера.',
  49792: 'Ресторан 360 на 89 этаже башни «Федерация» в Москва-Сити. Панорамный вид на весь город, авторская кухня и премиальная барная карта.',
  46275: 'Whisky Rooms — бар-ресторан в Леонтьевском переулке. Коллекция из 300+ сортов виски, стейки, сигарная комната и атмосфера лондонского клуба.',
  51511: 'Тхали и Карри — аутентичная индийская кухня на Тверской. Тхали, карри, тандурные блюда и вегетарианское меню.',
};

// Cuisine assignments based on restaurant descriptions
const CUISINE_MAP: Record<number, string[]> = {
  51423: ['european', 'russian'],
  47434: ['european', 'russian'],
  47530: ['author', 'european'],
  47527: ['author', 'european'],
  47730: ['european', 'author'],
  44846: ['european', 'russian'],
  46043: ['georgian', 'caucasian'],
  49792: ['author', 'european'],
  46275: ['steakhouse', 'european'],
  51511: ['indian'],
};

const PRICE_LEVELS: Record<number, number> = {
  51423: 2, 47434: 2, 47530: 3, 47527: 3, 47730: 3,
  44846: 2, 46043: 2, 49792: 4, 46275: 3, 51511: 2,
};

const AVG_BILLS: Record<number, number> = {
  51423: 1200, 47434: 1500, 47530: 2500, 47527: 3000, 47730: 2500,
  44846: 1500, 46043: 1800, 49792: 5000, 46275: 3500, 51511: 1200,
};

const RATINGS: Record<number, number> = {
  51423: 4.6, 47434: 4.4, 47530: 4.7, 47527: 4.8, 47730: 4.5,
  44846: 4.3, 46043: 4.7, 49792: 4.9, 46275: 4.6, 51511: 4.5,
};

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

async function run() {
  const SqliteDB = (BetterSqlite3 as any).default || BetterSqlite3;
  const sqlite = new SqliteDB(PIPELINE_DB, { readonly: true });
  await pg.initialize();

  console.log('🧹 Cleaning old data...');
  await pg.query('DELETE FROM restaurant_dishes');
  await pg.query('DELETE FROM dishes');
  await pg.query('DELETE FROM photos WHERE restaurant_id IN (SELECT id FROM restaurants)');
  await pg.query('DELETE FROM restaurant_cuisines');
  await pg.query('DELETE FROM restaurant_features');
  await pg.query('DELETE FROM restaurants');
  console.log('   Done.\n');

  // Get city/cuisine ID maps
  const pgCities = await pg.query('SELECT id, slug FROM cities');
  const cityIdBySlug: Record<string, number> = {};
  for (const c of pgCities) cityIdBySlug[c.slug] = c.id;

  const pgCuisines = await pg.query('SELECT id, slug FROM cuisines');
  const cuisineIdBySlug: Record<string, number> = {};
  for (const c of pgCuisines) cuisineIdBySlug[c.slug] = c.id;

  const pgFeatures = await pg.query('SELECT id, slug FROM features');
  const featureIdBySlug: Record<string, number> = {};
  for (const f of pgFeatures) featureIdBySlug[f.slug] = f.id;

  let totalDishes = 0;
  let totalPhotos = 0;

  for (const srcId of TARGET_IDS) {
    const r = sqlite.prepare('SELECT * FROM restaurants WHERE id = ?').get(srcId) as any;
    if (!r) { console.log(`⚠️  ID ${srcId} not found`); continue; }

    const citySlug = CITY_MAP[r.city];
    const cityId = citySlug ? cityIdBySlug[citySlug] : null;
    if (!cityId) { console.log(`⚠️  City "${r.city}" not mapped`); continue; }

    // Unique slug
    let slug = r.slug.replace(/-\d+$/, ''); // remove trailing number
    const slugExists = await pg.query('SELECT id FROM restaurants WHERE slug = $1', [slug]);
    if (slugExists.length > 0) slug = `${slug}-${r.city.toLowerCase().replace(/[^a-z]/g, '')}`;

    const desc = DESCRIPTIONS[srcId] || r.description;
    const rating = RATINGS[srcId] || 4.0;

    // Insert restaurant
    const [inserted] = await pg.query(`
      INSERT INTO restaurants (name, slug, description, city_id, address, metro_station, lat, lng, phone, website,
        price_level, average_bill, has_wifi, has_delivery, rating, review_count, status, is_verified, published_at, legacy_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'published',false,NOW(),$17)
      RETURNING id
    `, [
      r.name, slug, desc, cityId, r.address, r.metro_station, r.lat, r.lng, r.phone, r.website,
      PRICE_LEVELS[srcId] || 2, AVG_BILLS[srcId] || 1500,
      r.has_wifi === 1, r.has_delivery === 1,
      rating, Math.floor(30 + Math.random() * 200),
      r.legacy_id,
    ]);
    const restaurantId = inserted.id;

    // Cuisines
    const cuisineSlugs = CUISINE_MAP[srcId] || ['european'];
    for (const cs of cuisineSlugs) {
      const cid = cuisineIdBySlug[cs];
      if (cid) await pg.query('INSERT INTO restaurant_cuisines (restaurant_id, cuisine_id) VALUES ($1,$2)', [restaurantId, cid]);
    }

    // Features from pipeline
    try {
      const features = JSON.parse(r.features || '[]') as string[];
      for (const fs of features) {
        const fid = featureIdBySlug[fs];
        if (fid) await pg.query('INSERT INTO restaurant_features (restaurant_id, feature_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [restaurantId, fid]);
      }
    } catch {}

    // Photos (all)
    const photos = sqlite.prepare('SELECT * FROM photos WHERE restaurant_id = ? ORDER BY is_primary DESC').all(srcId) as any[];
    for (let i = 0; i < photos.length; i++) {
      await pg.query(
        'INSERT INTO photos (restaurant_id, url, sort_order, is_cover, source, alt_text) VALUES ($1,$2,$3,$4,$5,$6)',
        [restaurantId, photos[i].url, i, i === 0, 'legacy', photos[i].caption || `${r.name} — фото ${i + 1}`]
      );
    }
    totalPhotos += photos.length;

    // Dishes (all)
    const dishes = sqlite.prepare('SELECT * FROM dishes WHERE restaurant_id = ? ORDER BY category, id').all(srcId) as any[];
    let sortOrder = 0;
    for (const d of dishes) {
      const category = (d.category || 'Другое').trim().replace(/\s+/g, ' ');
      const [dish] = await pg.query(`
        INSERT INTO dishes (name, description, composition, calories, protein, fat, carbs, image_url, is_healthy_choice, legacy_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (legacy_id) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `, [
        d.name, d.description || null, d.composition || null,
        d.calories || null, d.protein || null, d.fat || null, d.carbs || null,
        d.photo_url || null, d.is_healthy_choice === 1, d.legacy_id,
      ]);
      await pg.query(
        'INSERT INTO restaurant_dishes (restaurant_id, dish_id, category_name, price, is_available, sort_order) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING',
        [restaurantId, dish.id, category, 0, d.is_available === 1, sortOrder++]
      );
    }
    totalDishes += dishes.length;

    console.log(`✅ ${r.name} (${r.city}) — ${photos.length} фото, ${dishes.length} блюд, ${cuisineSlugs.join('+')} [/${slug}]`);
  }

  console.log(`\n🎉 Импортировано ${TARGET_IDS.length} ресторанов, ${totalPhotos} фото, ${totalDishes} блюд`);

  sqlite.close();
  await pg.destroy();
}

run().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
