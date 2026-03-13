import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as BetterSqlite3 from 'better-sqlite3';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const PIPELINE_DB = path.resolve(__dirname, '../../../../restaurant_pipeline/data/processed/pipeline.db');
const MANGO_ID = 51423; // ID in pipeline.db

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

  console.log('🥭 Importing Манго restaurant...\n');

  // Get restaurant data
  const r = sqlite.prepare('SELECT * FROM restaurants WHERE id = ?').get(MANGO_ID) as any;
  if (!r) throw new Error('Restaurant not found in pipeline.db');

  // Get Moscow city ID
  const [moscowCity] = await pg.query("SELECT id FROM cities WHERE slug = 'moscow'");
  if (!moscowCity) throw new Error('Moscow not found in PostgreSQL');
  const cityId = moscowCity.id;

  // Check if already exists
  const existing = await pg.query("SELECT id FROM restaurants WHERE slug = 'mango'");
  if (existing.length > 0) {
    console.log('⏭️  Манго already exists (id=' + existing[0].id + '), deleting to re-import...');
    await pg.query('DELETE FROM restaurant_dishes WHERE restaurant_id = $1', [existing[0].id]);
    await pg.query('DELETE FROM photos WHERE restaurant_id = $1', [existing[0].id]);
    await pg.query('DELETE FROM restaurant_cuisines WHERE restaurant_id = $1', [existing[0].id]);
    await pg.query('DELETE FROM restaurants WHERE id = $1', [existing[0].id]);
  }

  // Insert restaurant
  const [inserted] = await pg.query(`
    INSERT INTO restaurants (name, slug, description, city_id, address, metro_station, lat, lng, phone, website,
      price_level, average_bill, has_wifi, has_delivery, rating, review_count, status, is_verified, published_at, legacy_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'published', false, NOW(), $17)
    RETURNING id
  `, [
    'Манго', 'mango',
    'Ресторан «Манго» расположен у метро Преображенская площадь. Уютная атмосфера, разнообразная кухня — от бизнес-ланчей до банкетов. Салаты, горячие закуски, главные блюда, десерты и широкий выбор напитков.',
    cityId,
    'Преображенская площадь, 7А строение 1',
    'Преображенская площадь',
    55.795624, 37.709552,
    '+7 495 780-76-71',
    'mangocafe.ru',
    2, // priceLevel
    1200, // averageBill
    true, false,
    4.6, // rating
    47, // reviewCount
    r.legacy_id,
  ]);
  const restaurantId = inserted.id;
  console.log(`✅ Restaurant inserted (id=${restaurantId})`);

  // Assign cuisines: Европейская + Русская
  const cuisines = await pg.query("SELECT id, slug FROM cuisines WHERE slug IN ('european', 'russian')");
  for (const c of cuisines) {
    await pg.query('INSERT INTO restaurant_cuisines (restaurant_id, cuisine_id) VALUES ($1, $2)', [restaurantId, c.id]);
    console.log(`  🍳 Cuisine: ${c.slug}`);
  }

  // Import photos
  const photos = sqlite.prepare('SELECT * FROM photos WHERE restaurant_id = ?').all(MANGO_ID) as any[];
  for (let i = 0; i < photos.length; i++) {
    const p = photos[i];
    await pg.query(`
      INSERT INTO photos (restaurant_id, url, sort_order, is_cover, source, alt_text)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [restaurantId, p.url, i, i === 0, 'legacy', p.caption || `Интерьер ресторана Манго`]);
  }
  console.log(`  📸 Photos: ${photos.length}`);

  // Import dishes
  const dishes = sqlite.prepare('SELECT * FROM dishes WHERE restaurant_id = ? ORDER BY category, id').all(MANGO_ID) as any[];

  // Normalize categories
  const categoryMap: Record<string, string> = {};
  const categoryOrder: string[] = [];
  for (const d of dishes) {
    const cat = (d.category || 'Другое').trim().replace(/\s+/g, ' ');
    if (!categoryMap[d.category]) {
      categoryMap[d.category] = cat;
      categoryOrder.push(cat);
    }
  }

  let dishCount = 0;
  let sortOrder = 0;

  for (const d of dishes) {
    const category = categoryMap[d.category] || 'Другое';

    // Insert dish
    const [dish] = await pg.query(`
      INSERT INTO dishes (name, description, composition, calories, protein, fat, carbs, image_url, is_healthy_choice, legacy_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (legacy_id) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, [
      d.name,
      d.description || null,
      d.composition || null,
      d.calories || null,
      d.protein || null,
      d.fat || null,
      d.carbs || null,
      d.photo_url || null,
      d.is_healthy_choice === 1,
      d.legacy_id,
    ]);

    // Link to restaurant
    await pg.query(`
      INSERT INTO restaurant_dishes (restaurant_id, dish_id, category_name, price, is_available, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (restaurant_id, dish_id) DO NOTHING
    `, [
      restaurantId,
      dish.id,
      category,
      0, // price unknown (in kopecks)
      d.is_available === 1,
      sortOrder++,
    ]);

    dishCount++;
  }
  console.log(`  🍽️  Dishes: ${dishCount} (${[...new Set(Object.values(categoryMap))].length} categories)`);

  // Import features
  const features = JSON.parse(r.features || '[]') as string[];
  if (features.length > 0) {
    for (const featureSlug of features) {
      const [feat] = await pg.query('SELECT id FROM features WHERE slug = $1', [featureSlug]);
      if (feat) {
        await pg.query('INSERT INTO restaurant_features (restaurant_id, feature_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [restaurantId, feat.id]);
        console.log(`  ⚡ Feature: ${featureSlug}`);
      }
    }
  }

  console.log(`\n🎉 Манго imported successfully!`);
  console.log(`   ${photos.length} photos, ${dishCount} dishes, ${cuisines.length} cuisines`);

  sqlite.close();
  await pg.destroy();
}

run().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
