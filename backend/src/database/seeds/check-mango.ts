import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const pg = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'menurest',
  username: process.env.DB_USER || 'menurest',
  password: process.env.DB_PASSWORD,
  synchronize: false,
});

async function run() {
  await pg.initialize();

  const r = await pg.query("SELECT id FROM restaurants WHERE slug = 'mango'");
  console.log('Restaurant:', r);

  if (r.length) {
    const rid = r[0].id;
    const dishes = await pg.query('SELECT COUNT(*) as cnt FROM restaurant_dishes WHERE restaurant_id = $1', [rid]);
    const photos = await pg.query('SELECT COUNT(*) as cnt FROM photos WHERE restaurant_id = $1', [rid]);
    const allDishes = await pg.query('SELECT COUNT(*) as cnt FROM dishes');
    console.log('Restaurant dishes:', dishes[0].cnt, '| Photos:', photos[0].cnt, '| Total dishes table:', allDishes[0].cnt);
  }

  // Test insert
  try {
    const [dish] = await pg.query("INSERT INTO dishes (name, legacy_id) VALUES ('__test__', 999999) RETURNING id");
    console.log('Test dish OK, id:', dish.id);
    const [rd] = await pg.query(
      'INSERT INTO restaurant_dishes (restaurant_id, dish_id, category_name, price, is_available, sort_order) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [r[0]?.id || 51, dish.id, 'Test', 0, true, 0]
    );
    console.log('Test restaurant_dish OK, id:', rd.id);
    await pg.query('DELETE FROM restaurant_dishes WHERE id = $1', [rd.id]);
    await pg.query('DELETE FROM dishes WHERE id = $1', [dish.id]);
    console.log('Cleanup OK');
  } catch (e: any) {
    console.error('Test insert error:', e.message);
  }

  await pg.destroy();
}

run().catch(console.error);
