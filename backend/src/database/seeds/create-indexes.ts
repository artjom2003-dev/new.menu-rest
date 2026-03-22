import 'reflect-metadata';
import { DataSource } from 'typeorm';

async function main() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_DATABASE || 'menurest',
    username: process.env.DB_USER || 'menurest',
    password: process.env.DB_PASSWORD || 'menurest_dev_pass',
    synchronize: false,
  });

  await ds.initialize();
  console.log('Connected');

  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_restaurants_status_rating ON restaurants (status, rating DESC)',
    'CREATE INDEX IF NOT EXISTS idx_restaurants_status_created ON restaurants (status, created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_restaurants_venue_type ON restaurants (venue_type)',
    'CREATE INDEX IF NOT EXISTS idx_restaurants_price_level ON restaurants (price_level)',
    'CREATE INDEX IF NOT EXISTS idx_photos_restaurant_cover ON photos (restaurant_id, is_cover)',
    'CREATE INDEX IF NOT EXISTS idx_restaurant_cuisines_rid ON restaurant_cuisines (restaurant_id)',
    'CREATE INDEX IF NOT EXISTS idx_restaurant_cuisines_cid ON restaurant_cuisines (cuisine_id)',
  ];

  for (const sql of indexes) {
    await ds.query(sql);
    console.log('OK:', sql.split(' ON ')[0].replace('CREATE INDEX IF NOT EXISTS ', ''));
  }

  await ds.destroy();
  console.log('Done');
}

main().catch(e => { console.error(e.message); process.exit(1); });
