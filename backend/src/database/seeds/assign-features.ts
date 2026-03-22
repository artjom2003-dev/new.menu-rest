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

// ─── Keyword patterns per feature slug ───
// Each value is an array of regex patterns (case-insensitive, Russian)
const FEATURE_KEYWORDS: Record<string, string[]> = {
  // occasion
  'romantic-dinner': ['романтик', 'свидани', 'для двоих', 'уютн.*вечер', 'при свечах', 'романтическ'],
  'with-friends': ['друз', 'компан', 'весел', 'шумн', 'тусов', 'дружеск'],
  'family': ['семь', 'семейн', 'для всей семь', 'с детьми'],
  'business-meeting': ['делов', 'переговор', 'бизнес.*встреч', 'корпоратив'],
  'business-lunch': ['бизнес.?ланч', 'деловой обед', 'ланч меню', 'бизнес-ланч'],
  'large-group': ['банкетн.*зал', 'большая компан', 'большой компан', 'на компанию', 'большие компании'],
  'breakfast-brunch': ['завтрак', 'бранч', 'brunch', 'утренн'],
  'late-dinner': ['поздн.*ужин', 'допоздна', 'до последн.*гост', 'ночн.*кухн', 'после полуноч'],
  'banquet': ['банкет', 'мероприят', 'свадьб', 'юбилей', 'торжеств', 'праздник', 'выпускн'],
  'quick-bite': ['быстр.*перекус', 'быстр.*обед', 'на вынос', 'фаст', 'экспресс.?ланч', 'take.?away'],
  'laptop-work': ['ноутбук', 'коворкинг', 'поработ', 'фрилансер', 'для работы', 'рабочее простр'],

  // atmosphere
  'quiet': ['тих', 'спокойн', 'уютн', 'уединен', 'камерн', 'негромк'],
  'terrace': ['веранд', 'террас', 'на крыш', 'летн.*площ', 'открыт.*площ', 'патио', 'летн.*террас'],
  'live-music': ['живая музык', 'живой звук', 'концерт', 'live.*music', 'акустическ', 'музыканты'],
  'pet-friendly': ['с животн', 'питомц', 'pet.?friendly', 'собак', 'кошк', 'с питомц', 'с собак'],
  'kids-room': ['детск.*комнат', 'детск.*зон', 'игров.*комнат', 'детская площ', 'игровая зона'],
  'kids-chairs': ['детск.*стул', 'стульчик', 'высок.*стул'],
  'parking': ['парковк', 'стоянк', 'parking', 'паркинг'],
  'wifi': ['wi-fi', 'wifi', 'вай-фай', 'вайфай', 'розетк', 'бесплатн.*интернет'],
  'kids-friendly': ['для детей', 'детск.*меню', 'аниматор', 'детск.*праздник', 'с ребёнком', 'с ребенком'],
  'wheelchair': ['инвалид.*коляс', 'коляс.*инвалид', '\\bмгн\\b', 'маломобильн', 'пандус', 'доступн.*сред', 'безбарьерн', 'wheelchair'],
  'ac': ['кондиционер', 'климат.?контроль', 'кондициони'],
  'panorama': ['панорам', 'вид на город', 'с видом на', 'видов.*окн', 'панорамн.*вид', 'вид.*на.*реку'],
  'private-room': ['отдельн.*зал', 'vip.*зал', 'вип.*зал', 'приватн', 'отдельн.*кабин', 'банкетн.*зал'],

  // entertainment
  'karaoke': ['караоке', 'karaoke'],
  'dj': ['ди-джей', '\\bdj\\b', 'диджей', 'ди джей'],
  'dance-floor': ['танцпол', 'танцевальн', 'дискотек', 'танц.*площ'],
  'board-games': ['настольн.*игр', 'board.*game', 'игротек', 'настолки'],
  'hookah': ['кальян', 'hookah', 'шиша'],
  'sports-tv': ['трансляци', 'спорт.*бар', 'футбол', 'матч.*на.*экран', 'спорт.*экран', 'большой экран'],
  'show': ['шоу.?программ', 'шоу программ', 'стриптиз', 'кабаре', 'варьете', 'развлекательн.*программ'],
};

const BATCH_SIZE = 1000;

async function assignFeatures() {
  await dataSource.initialize();
  console.log('🏷️  Авто-расстановка фич по описаниям...\n');

  // Load all features from DB
  const features: Array<{ id: number; slug: string }> = await dataSource.query(
    `SELECT id, slug FROM features`,
  );
  const featureMap = new Map(features.map(f => [f.slug, f.id]));

  // Compile regex patterns
  const compiledPatterns: Array<{ featureId: number; slug: string; regex: RegExp }> = [];
  for (const [slug, patterns] of Object.entries(FEATURE_KEYWORDS)) {
    const featureId = featureMap.get(slug);
    if (!featureId) {
      console.warn(`⚠️  Фича "${slug}" не найдена в БД, пропускаем`);
      continue;
    }
    const combined = patterns.join('|');
    compiledPatterns.push({
      featureId,
      slug,
      regex: new RegExp(combined, 'i'),
    });
  }

  // Count total restaurants
  const [{ count: totalStr }] = await dataSource.query(`SELECT COUNT(*) as count FROM restaurants`);
  const total = parseInt(totalStr, 10);
  console.log(`📊 Всего ресторанов: ${total}`);

  let processed = 0;
  let totalInserted = 0;
  const stats: Record<string, number> = {};

  // Process in batches
  for (let offset = 0; offset < total; offset += BATCH_SIZE) {
    const restaurants: Array<{ id: number; name: string; description: string | null; venue_type: string | null }> =
      await dataSource.query(
        `SELECT id, name, description, venue_type FROM restaurants ORDER BY id LIMIT $1 OFFSET $2`,
        [BATCH_SIZE, offset],
      );

    const insertValues: Array<{ restaurant_id: number; feature_id: number }> = [];

    for (const r of restaurants) {
      const text = [r.name, r.description, r.venue_type].filter(Boolean).join(' ').toLowerCase();
      if (!text) continue;

      for (const { featureId, slug, regex } of compiledPatterns) {
        if (regex.test(text)) {
          insertValues.push({ restaurant_id: r.id, feature_id: featureId });
          stats[slug] = (stats[slug] || 0) + 1;
        }
      }
    }

    // Bulk insert with ON CONFLICT DO NOTHING
    if (insertValues.length > 0) {
      const valuesStr = insertValues
        .map(v => `(${v.restaurant_id}, ${v.feature_id})`)
        .join(',');
      const result = await dataSource.query(
        `INSERT INTO restaurant_features (restaurant_id, feature_id) VALUES ${valuesStr} ON CONFLICT DO NOTHING`,
      );
      totalInserted += result[1] || insertValues.length;
    }

    processed += restaurants.length;
    if (processed % 5000 === 0 || processed >= total) {
      console.log(`  📦 Обработано: ${processed}/${total}`);
    }
  }

  console.log(`\n✅ Готово! Добавлено связей: ${totalInserted}`);
  console.log('\n📊 Статистика по фичам (совпадений в текстах):');

  const sortedStats = Object.entries(stats).sort((a, b) => b[1] - a[1]);
  for (const [slug, count] of sortedStats) {
    console.log(`  ${slug}: ${count}`);
  }

  // Final verification
  const verification: Array<{ category: string; name: string; count: string }> = await dataSource.query(`
    SELECT f.category, f.name, COUNT(rf.restaurant_id)::text as count
    FROM features f
    LEFT JOIN restaurant_features rf ON rf.feature_id = f.id
    GROUP BY f.id, f.category, f.name
    ORDER BY f.category, COUNT(rf.restaurant_id) DESC
  `);

  console.log('\n📋 Итоговая таблица (фичи в БД):');
  let currentCat = '';
  for (const row of verification) {
    if (row.category !== currentCat) {
      currentCat = row.category;
      console.log(`\n  ── ${currentCat.toUpperCase()} ──`);
    }
    console.log(`    ${row.name}: ${row.count} ресторанов`);
  }

  await dataSource.destroy();
}

assignFeatures().catch((err) => {
  console.error('❌ Ошибка:', err);
  process.exit(1);
});
