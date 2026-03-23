/**
 * Этап 1: Заполнение venue_type из описаний ресторанов.
 * Только venue_type — никаких новых фич не создаётся.
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'menurest',
  username: process.env.DB_USER || 'menurest',
  password: process.env.DB_PASSWORD,
  synchronize: false,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
});

// Ordered by specificity (more specific first)
const VENUE_TYPE_PATTERNS: Array<{ type: string; patterns: RegExp }> = [
  { type: 'sushi-bar', patterns: /суши[\s-]?бар/i },
  { type: 'wine-bar', patterns: /вин(?:ный|отек|ный бар|о-бар)/i },
  { type: 'beer-bar', patterns: /пивн(?:ой|ая|ой бар)|крафт(?:овый|овая)?\s*бар|пивоварн|brewpub|brew pub|паб/i },
  { type: 'gastropub', patterns: /гастро(?:бар|паб)|gastro(?:bar|pub)/i },
  { type: 'coffeehouse', patterns: /кофейн[яиь]|coffee\s*(?:shop|house)|кофе[\s-]?хаус/i },
  { type: 'bakery', patterns: /пекарн[яиь]|хлеб(?:ная|опекарня)|булочная|bakery/i },
  { type: 'confectionery', patterns: /кондитерск[аяой]|confectionery|десертн[аяой]/i },
  { type: 'pizzeria', patterns: /пиццери[яиь]|pizzeria/i },
  { type: 'steakhouse', patterns: /стейк[\s-]?хаус|steakhouse|мясн(?:ой|ая) ресторан|гриль[\s-]?бар/i },
  { type: 'lounge', patterns: /лаунж|lounge|кальянн/i },
  { type: 'karaoke', patterns: /караоке/i },
  { type: 'fast-food', patterns: /фаст[\s-]?фуд|fast[\s-]?food|бургерн/i },
  { type: 'bistro', patterns: /бистро|bistro/i },
  { type: 'canteen', patterns: /столов[аяой]/i },
  { type: 'bar', patterns: /(?:^|\s)бар(?:\s|$|,|\.)|(?:^|\s)бар(?:е|у|а|ов|ом)(?:\s|$|,|\.)|спорт[\s-]?бар|коктейль[\s-]?бар/i },
  { type: 'cafe', patterns: /(?:^|\s)кафе(?:\s|$|,|\.)|кафетерий/i },
  { type: 'restaurant', patterns: /ресторан/i },
];

const BATCH_SIZE = 1000;

async function enrich() {
  await dataSource.initialize();
  console.log('🔬 Заполняем venue_type из описаний\n');

  const [{ count: nullVenueCount }] = await dataSource.query(
    `SELECT COUNT(*) as count FROM restaurants WHERE venue_type IS NULL AND description IS NOT NULL`,
  );
  console.log(`Ресторанов без venue_type (с описанием): ${nullVenueCount}`);

  let venueUpdated = 0;
  const venueStats: Record<string, number> = {};

  for (let offset = 0; offset < parseInt(nullVenueCount, 10); offset += BATCH_SIZE) {
    const rows: Array<{ id: number; name: string; description: string }> = await dataSource.query(
      `SELECT id, name, description FROM restaurants WHERE venue_type IS NULL AND description IS NOT NULL ORDER BY id LIMIT $1 OFFSET $2`,
      [BATCH_SIZE, offset],
    );

    for (const r of rows) {
      const text = `${r.name} ${r.description}`;
      for (const { type, patterns } of VENUE_TYPE_PATTERNS) {
        if (patterns.test(text)) {
          await dataSource.query(`UPDATE restaurants SET venue_type = $1 WHERE id = $2`, [type, r.id]);
          venueUpdated++;
          venueStats[type] = (venueStats[type] || 0) + 1;
          break;
        }
      }
    }

    if ((offset + BATCH_SIZE) % 5000 === 0 || offset + BATCH_SIZE >= parseInt(nullVenueCount, 10)) {
      console.log(`  Обработано: ${Math.min(offset + BATCH_SIZE, parseInt(nullVenueCount, 10))}/${nullVenueCount}`);
    }
  }

  console.log(`\n✅ Обновлено venue_type: ${venueUpdated}`);
  for (const [type, count] of Object.entries(venueStats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`);
  }

  // Show full distribution
  const venueDistrib: Array<{ venue_type: string; count: string }> = await dataSource.query(
    `SELECT COALESCE(venue_type, 'NULL') as venue_type, COUNT(*)::text as count FROM restaurants GROUP BY venue_type ORDER BY COUNT(*) DESC LIMIT 20`,
  );
  console.log('\n📋 Распределение venue_type:');
  for (const row of venueDistrib) {
    console.log(`  ${row.venue_type}: ${row.count}`);
  }

  await dataSource.destroy();
}

enrich().catch((err) => {
  console.error('❌ Ошибка:', err);
  process.exit(1);
});
