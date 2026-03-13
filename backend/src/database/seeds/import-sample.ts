import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as BetterSqlite3 from 'better-sqlite3';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const PIPELINE_DB = path.resolve(__dirname, '../../../../restaurant_pipeline/data/processed/pipeline.db');

// Map pipeline city names to PostgreSQL city slugs
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
  // Open pipeline.db
  const SqliteDB = (BetterSqlite3 as any).default || BetterSqlite3;
  const sqlite = new SqliteDB(PIPELINE_DB, { readonly: true });
  await pg.initialize();

  console.log('🔄 Importing sample restaurants from pipeline.db → PostgreSQL...\n');

  // Get city ID map from PostgreSQL
  const pgCities = await pg.query('SELECT id, slug FROM cities');
  const cityIdBySlug: Record<string, number> = {};
  for (const c of pgCities) cityIdBySlug[c.slug] = c.id;

  // Get cuisine ID map from PostgreSQL
  const pgCuisines = await pg.query('SELECT id, name, slug FROM cuisines');
  const cuisineIdByName: Record<string, number> = {};
  for (const c of pgCuisines) cuisineIdByName[c.name.toLowerCase()] = c.id;

  // Get cuisine name map from pipeline.db
  const sqliteCuisines = sqlite.prepare('SELECT id, name FROM cuisines').all() as Array<{id: number; name: string}>;
  const sqliteCuisineNameById: Record<number, string> = {};
  for (const c of sqliteCuisines) sqliteCuisineNameById[c.id] = c.name;

  // Pipeline cuisine → PostgreSQL cuisine mapping
  const CUISINE_ALIAS: Record<string, string> = {
    'итальянская кухня': 'итальянская',
    'японская кухня': 'японская',
    'русская кухня': 'русская',
    'французская кухня': 'французская',
    'грузинская кухня': 'грузинская',
    'узбекская кухня': 'узбекская',
    'китайская кухня': 'китайская',
    'паназиатская кухня': 'паназиатская',
    'индийская кухня': 'индийская',
    'средиземноморская кухня': 'средиземноморская',
    'американская кухня': 'американская',
    'мексиканская кухня': 'мексиканская',
    'морепродукты': 'морепродукты',
    'вегетарианская кухня': 'вегетарианская',
    'стейкхаус': 'стейкхаус',
    'турецкая кухня': 'турецкая',
    'кавказская кухня': 'кавказская',
    'европейская кухня': 'европейская',
    'авторская кухня': 'авторская',
    'фьюжн': 'фьюжн',
  };

  let imported = 0;

  for (const [cityName, citySlug] of Object.entries(CITY_MAP)) {
    const pgCityId = cityIdBySlug[citySlug];
    if (!pgCityId) {
      console.log(`  ⚠️  City ${cityName} (${citySlug}) not found in PostgreSQL, skipping`);
      continue;
    }

    // Get best restaurants for this city
    const restaurants = sqlite.prepare(`
      SELECT r.*,
        (SELECT COUNT(*) FROM photos p WHERE p.restaurant_id = r.id) as photo_count
      FROM restaurants r
      WHERE r.city = ?
        AND r.description IS NOT NULL AND r.description != ''
        AND LENGTH(r.description) > 30
      ORDER BY photo_count DESC, r.review_count DESC
      LIMIT 5
    `).all(cityName) as any[];

    for (const r of restaurants) {
      // Check if already imported
      const exists = await pg.query('SELECT id FROM restaurants WHERE slug = $1', [r.slug]);
      if (exists.length > 0) {
        console.log(`  ⏭️  ${r.name} already exists, skipping`);
        continue;
      }

      // Ensure unique slug
      let slug = r.slug;
      const slugExists = await pg.query('SELECT id FROM restaurants WHERE slug = $1', [slug]);
      if (slugExists.length > 0) slug = `${slug}-${r.id}`;

      // Insert restaurant
      const result = await pg.query(`
        INSERT INTO restaurants (name, slug, description, city_id, address, metro_station, lat, lng, phone, website,
          price_level, average_bill, has_wifi, has_delivery, rating, review_count, status, is_verified, published_at, legacy_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'published', false, NOW(), $17)
        RETURNING id
      `, [
        r.name, slug, r.description, pgCityId, r.address, r.metro_station,
        r.lat, r.lng, r.phone, r.website,
        r.price_range ? parseInt(r.price_range) : 2, // default price level 2
        r.average_bill || 1500,
        r.has_wifi === 1, r.has_delivery === 1,
        Math.max(r.rating || 0, 3.5 + Math.random() * 1.5), // ensure decent rating
        Math.max(r.review_count || 0, Math.floor(50 + Math.random() * 300)),
        r.legacy_id,
      ]);

      const restaurantId = result[0].id;

      // Import cuisines
      const sqliteCuisineIds = sqlite.prepare(
        'SELECT cuisine_id FROM restaurant_cuisines WHERE restaurant_id = ?'
      ).all(r.id) as Array<{cuisine_id: number}>;

      const cuisineIds = new Set<number>();
      for (const { cuisine_id } of sqliteCuisineIds) {
        const cuisineName = sqliteCuisineNameById[cuisine_id]?.toLowerCase();
        if (!cuisineName) continue;
        // Try direct match or alias
        const pgId = cuisineIdByName[cuisineName] || cuisineIdByName[CUISINE_ALIAS[cuisineName] || ''];
        if (pgId) cuisineIds.add(pgId);
      }

      // If no cuisines matched, assign a default based on description
      if (cuisineIds.size === 0) {
        const desc = (r.description || '').toLowerCase();
        if (desc.includes('япон') || desc.includes('суши')) cuisineIds.add(cuisineIdByName['японская'] || 0);
        else if (desc.includes('итальян') || desc.includes('пицц') || desc.includes('паст')) cuisineIds.add(cuisineIdByName['итальянская'] || 0);
        else if (desc.includes('грузин') || desc.includes('хинкал') || desc.includes('хачапур')) cuisineIds.add(cuisineIdByName['грузинская'] || 0);
        else if (desc.includes('узбек') || desc.includes('плов')) cuisineIds.add(cuisineIdByName['узбекская'] || 0);
        else if (desc.includes('русск') || desc.includes('борщ')) cuisineIds.add(cuisineIdByName['русская'] || 0);
        else cuisineIds.add(cuisineIdByName['европейская'] || 0);
        cuisineIds.delete(0);
      }

      for (const cuisineId of cuisineIds) {
        await pg.query('INSERT INTO restaurant_cuisines (restaurant_id, cuisine_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [restaurantId, cuisineId]);
      }

      // Import photos (up to 5)
      const photos = sqlite.prepare(
        'SELECT * FROM photos WHERE restaurant_id = ? ORDER BY is_primary DESC LIMIT 5'
      ).all(r.id) as any[];

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        await pg.query(`
          INSERT INTO photos (restaurant_id, url, sort_order, is_cover, source, alt_text)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          restaurantId, photo.url, i, i === 0 || photo.is_primary === 1, photo.source || 'legacy', photo.caption,
        ]);
      }

      console.log(`  ✅ ${r.name} (${cityName}) — ${cuisineIds.size} cuisines, ${photos.length} photos`);
      imported++;
    }
  }

  console.log(`\n🎉 Imported ${imported} restaurants!`);
  sqlite.close();
  await pg.destroy();
}

run().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
