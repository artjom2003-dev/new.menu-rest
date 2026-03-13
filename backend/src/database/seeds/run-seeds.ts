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

  // Features
  const featureRepo = dataSource.getRepository('features');
  for (const feature of featuresSeed) {
    const exists = await featureRepo.findOneBy({ slug: feature.slug });
    if (!exists) {
      await featureRepo.save(feature);
      console.log(`  ✅ Фича: ${feature.name}`);
    }
  }

  console.log('🎉 Seeds завершены!');
  await dataSource.destroy();
}

runSeeds().catch((err) => {
  console.error('❌ Ошибка seeds:', err);
  process.exit(1);
});
