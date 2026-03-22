import 'reflect-metadata';
import { DataSource } from 'typeorm';

async function main() {
  const ds = new DataSource({
    type: 'postgres', host: 'localhost', port: 5432,
    database: 'menurest', username: 'menurest', password: 'menurest_dev_pass',
    synchronize: false,
  });
  await ds.initialize();

  await ds.query('ANALYZE restaurants');
  await ds.query('ANALYZE photos');
  await ds.query('ANALYZE restaurant_cuisines');
  console.log('ANALYZE done');

  let t = Date.now();
  const r1 = await ds.query("SELECT r.id, r.name, r.slug, r.rating FROM restaurants r WHERE r.status = 'published' ORDER BY r.rating DESC LIMIT 6");
  console.log('Simple SELECT:', Date.now() - t, 'ms');

  t = Date.now();
  await ds.query("SELECT COUNT(*) FROM restaurants WHERE status = 'published'");
  console.log('COUNT:', Date.now() - t, 'ms');

  t = Date.now();
  const r3 = await ds.query(`
    SELECT r.id, r.name, r.slug, r.rating, c.name as city_name
    FROM restaurants r
    LEFT JOIN cities c ON c.id = r.city_id
    WHERE r.status = 'published'
    ORDER BY r.rating DESC
    LIMIT 6
  `);
  console.log('With city JOIN:', Date.now() - t, 'ms');

  t = Date.now();
  const ids = r3.map((r: any) => r.id);
  await ds.query(`SELECT p.restaurant_id, p.url FROM photos p WHERE p.restaurant_id = ANY($1) AND p.is_cover = true`, [ids]);
  console.log('Photos for 6 items:', Date.now() - t, 'ms');

  await ds.destroy();
}
main().catch(e => { console.error(e); process.exit(1); });
