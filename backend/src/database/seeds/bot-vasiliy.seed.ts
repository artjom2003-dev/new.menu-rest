/**
 * Seed: create Bot Vasiliy — a test user present in all restaurant wishlists
 * Run: npx ts-node -r tsconfig-paths/register src/database/seeds/bot-vasiliy.seed.ts
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';

const BOT_EMAIL = 'bot.vasiliy@menurest.com';
const BOT_NAME = 'Бот Василий';

async function main() {
  const ds = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_DATABASE || 'menurest',
    username: process.env.DB_USER || 'menurest',
    password: process.env.DB_PASSWORD,
    synchronize: false,
  });

  await ds.initialize();
  console.log('Connected to database');

  // 1. Create or find the bot user
  let bot = await ds.query(
    `SELECT id FROM users WHERE email = $1`,
    [BOT_EMAIL],
  );

  if (bot.length === 0) {
    await ds.query(
      `INSERT INTO users (email, name, loyalty_level, loyalty_points, role, auth_provider, hide_from_wishlists, block_messages)
       VALUES ($1, $2, 'gold', 500, 'user', 'email', false, false)`,
      [BOT_EMAIL, BOT_NAME],
    );
    bot = await ds.query(`SELECT id FROM users WHERE email = $1`, [BOT_EMAIL]);
    console.log(`Created bot user: ${BOT_NAME} (id=${bot[0].id})`);
  } else {
    console.log(`Bot user already exists (id=${bot[0].id})`);
  }

  const botId = bot[0].id;

  // 2. Add bot to wishlist of first 100 restaurants (or all if less)
  const restaurants = await ds.query(
    `SELECT id FROM restaurants WHERE status = 'published' ORDER BY rating DESC NULLS LAST LIMIT 100`,
  );

  let added = 0;
  for (const r of restaurants) {
    const exists = await ds.query(
      `SELECT 1 FROM user_wishlists WHERE user_id = $1 AND restaurant_id = $2`,
      [botId, r.id],
    );
    if (exists.length === 0) {
      await ds.query(
        `INSERT INTO user_wishlists (user_id, restaurant_id) VALUES ($1, $2)`,
        [botId, r.id],
      );
      added++;
    }
  }

  console.log(`Added bot to ${added} restaurant wishlists (${restaurants.length} total checked)`);

  await ds.destroy();
  console.log('Done!');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
