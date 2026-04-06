/**
 * Direct Elasticsearch reindex script.
 * Connects to PostgreSQL and ES directly, bypasses NestJS auth.
 * Usage: node scripts/reindex-es.js
 */
const { Client: PgClient } = require('pg');
const { Client: EsClient } = require('@elastic/elasticsearch');

const BATCH_SIZE = 5000;

async function main() {
  const pg = new PgClient({
    host: process.env.DB_HOST || '10.120.7.52',
    port: 5432,
    user: 'menurest',
    password: process.env.DB_PASSWORD || 'TFVXVltGVSJ5WTV7QSIkSHg6XVRSZiNJPTQ1e0IvMHVHKWA6YVZ9',
    database: 'menurest',
  });

  const es = new EsClient({ node: process.env.ES_HOST || 'http://10.120.7.52:9200' });
  const INDEX = 'restaurants';

  await pg.connect();
  console.log('Connected to PostgreSQL');

  // Check ES health
  const health = await es.cluster.health();
  console.log('ES cluster:', health.status);

  // Get total count
  const { rows: [{ count: total }] } = await pg.query(
    "SELECT count(*) FROM restaurants WHERE status = 'published'"
  );
  console.log(`Total published restaurants: ${total}`);

  // Fetch all published restaurants with joins
  const { rows: restaurants } = await pg.query(`
    SELECT
      r.id, r.name, r.slug, r.description, r.status,
      r.price_level, r.average_bill, r.rating, r.review_count,
      r.lat, r.lng,
      c.slug as city_slug,
      array_agg(DISTINCT cu.slug) FILTER (WHERE cu.slug IS NOT NULL) as cuisines,
      array_agg(DISTINCT cu.name) FILTER (WHERE cu.name IS NOT NULL) as cuisine_names,
      array_agg(DISTINCT f.slug) FILTER (WHERE f.slug IS NOT NULL) as features
    FROM restaurants r
    LEFT JOIN cities c ON r.city_id = c.id
    LEFT JOIN restaurant_cuisines rc ON rc.restaurant_id = r.id
    LEFT JOIN cuisines cu ON cu.id = rc.cuisine_id
    LEFT JOIN restaurant_features rf ON rf.restaurant_id = r.id
    LEFT JOIN features f ON f.id = rf.feature_id
    WHERE r.status = 'published'
    GROUP BY r.id, c.slug
  `);

  console.log(`Fetched ${restaurants.length} restaurants from DB`);

  // Fetch dishes separately
  const { rows: allDishes } = await pg.query(`
    SELECT rd.restaurant_id, d.name, rd.price, d.calories
    FROM restaurant_dishes rd
    JOIN dishes d ON d.id = rd.dish_id
  `);

  const dishMap = {};
  for (const d of allDishes) {
    if (!dishMap[d.restaurant_id]) dishMap[d.restaurant_id] = [];
    dishMap[d.restaurant_id].push({ name: d.name, price: d.price, calories: d.calories });
  }
  console.log(`Fetched dishes for ${Object.keys(dishMap).length} restaurants`);

  // Index in batches
  let indexed = 0;
  let errors = 0;

  for (let i = 0; i < restaurants.length; i += BATCH_SIZE) {
    const batch = restaurants.slice(i, i + BATCH_SIZE);
    const body = batch.flatMap(r => [
      { index: { _index: INDEX, _id: String(r.id) } },
      {
        id: r.id,
        name: r.name,
        slug: r.slug,
        description: r.description,
        city: r.city_slug,
        location: r.lat && r.lng ? { lat: Number(r.lat), lon: Number(r.lng) } : undefined,
        cuisines: r.cuisines || [],
        features: r.features || [],
        price_level: r.price_level,
        average_bill_min: r.average_bill,
        average_bill_max: r.average_bill,
        rating: Number(r.rating),
        review_count: r.review_count,
        status: r.status,
        suggest: { input: [r.name, ...(r.cuisine_names || [])] },
        dishes: dishMap[r.id] || [],
      },
    ]);

    try {
      const result = await es.bulk({ body, refresh: false });
      const batchErrors = result.errors
        ? result.items.filter(item => item.index?.error).length
        : 0;
      indexed += batch.length - batchErrors;
      errors += batchErrors;
      if (batchErrors > 0) {
        const sample = result.items.find(item => item.index?.error);
        console.log(`  Batch error sample:`, JSON.stringify(sample?.index?.error));
      }
    } catch (err) {
      console.error(`Batch ${i}-${i + BATCH_SIZE} failed:`, err.message);
      errors += batch.length;
    }

    const progress = Math.min(i + BATCH_SIZE, restaurants.length);
    process.stdout.write(`\rIndexed: ${progress}/${restaurants.length}`);
  }

  // Refresh index
  await es.indices.refresh({ index: INDEX });

  console.log(`\n\nDone! Indexed: ${indexed}, Errors: ${errors}`);

  // Verify
  const count = await es.count({ index: INDEX });
  console.log(`ES document count: ${count.count}`);

  // Test search for Krang
  const searchResult = await es.search({
    index: INDEX,
    body: { query: { match: { name: 'Krang' } } },
  });
  console.log(`Search for "Krang": ${searchResult.hits.total.value} results`);
  searchResult.hits.hits.forEach(h => console.log(`  - ${h._source.name} (id: ${h._id})`));

  await pg.end();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
