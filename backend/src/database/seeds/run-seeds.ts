import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { cuisinesSeed } from './cuisines.seed';
import { citiesSeed } from './cities.seed';
import { allergensSeed } from './allergens.seed';
import { featuresSeed } from './features.seed';

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

async function runSeeds() {
  await dataSource.initialize();
  console.log('📦 Запуск seeds...');

  // Cuisines
  const cuisineRepo = dataSource.getRepository('cuisines');
  for (const cuisine of cuisinesSeed) {
    const exists = await cuisineRepo.findOneBy({ slug: cuisine.slug });
    if (!exists) {
      await cuisineRepo.save(cuisine);
      console.log(`  ✅ Кухня: ${cuisine.name}`);
    }
  }

  // Cities
  const cityRepo = dataSource.getRepository('cities');
  for (const city of citiesSeed) {
    const exists = await cityRepo.findOneBy({ slug: city.slug });
    if (!exists) {
      await cityRepo.save(city);
      console.log(`  ✅ Город: ${city.name}`);
    }
  }

  // Allergens
  const allergenRepo = dataSource.getRepository('allergens');
  for (const allergen of allergensSeed) {
    const exists = await allergenRepo.findOneBy({ slug: allergen.slug });
    if (!exists) {
      await allergenRepo.save(allergen);
      console.log(`  ✅ Аллерген: ${allergen.name}`);
    }
  }

  // Features (upsert — update name/category/icon if slug exists)
  const featureRepo = dataSource.getRepository('features');
  for (const feature of featuresSeed) {
    await featureRepo
      .createQueryBuilder()
      .insert()
      .values(feature)
      .orUpdate(['name', 'category', 'icon'], ['slug'])
      .execute();
    console.log(`  ✅ Фича: ${feature.name}`);
  }
  // Remove features with old categories not in the new seed
  const validSlugs = featuresSeed.map(f => f.slug);
  await dataSource.query(
    `DELETE FROM features WHERE slug != ALL($1)`,
    [validSlugs],
  );
  console.log(`  🧹 Удалены устаревшие фичи (оставлено ${validSlugs.length})`);


  console.log('🎉 Seeds завершены!');
  await dataSource.destroy();
}

runSeeds().catch((err) => {
  console.error('❌ Ошибка seeds:', err);
  process.exit(1);
});
