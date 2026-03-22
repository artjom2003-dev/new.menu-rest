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

const testUsers = [
  { name: 'Алексей Гурман', email: 'aleksey.gurman@test.menurest.ru', loyaltyPoints: 3500, loyaltyLevel: 'gold' },
  { name: 'Мария Фудблогер', email: 'maria.foodblogger@test.menurest.ru', loyaltyPoints: 2800, loyaltyLevel: 'gold' },
  { name: 'Иван Ресторатор', email: 'ivan.restaurator@test.menurest.ru', loyaltyPoints: 2200, loyaltyLevel: 'gold' },
  { name: 'Дмитрий Критик', email: 'dmitry.kritik@test.menurest.ru', loyaltyPoints: 1200, loyaltyLevel: 'silver' },
  { name: 'Елена Путешественница', email: 'elena.travel@test.menurest.ru', loyaltyPoints: 900, loyaltyLevel: 'silver' },
  { name: 'Артём Шеф', email: 'artem.chef@test.menurest.ru', loyaltyPoints: 750, loyaltyLevel: 'silver' },
  { name: 'Ольга Сомелье', email: 'olga.sommelier@test.menurest.ru', loyaltyPoints: 620, loyaltyLevel: 'silver' },
  { name: 'Никита Бариста', email: 'nikita.barista@test.menurest.ru', loyaltyPoints: 510, loyaltyLevel: 'silver' },
  { name: 'Анна Кондитер', email: 'anna.konditer@test.menurest.ru', loyaltyPoints: 380, loyaltyLevel: 'bronze' },
  { name: 'Сергей Вкусоед', email: 'sergey.vkusoed@test.menurest.ru', loyaltyPoints: 290, loyaltyLevel: 'bronze' },
  { name: 'Катерина Фуди', email: 'katerina.foodie@test.menurest.ru', loyaltyPoints: 210, loyaltyLevel: 'bronze' },
  { name: 'Павел Гастроном', email: 'pavel.gastronom@test.menurest.ru', loyaltyPoints: 150, loyaltyLevel: 'bronze' },
  { name: 'Виктория Десертница', email: 'victoria.dessert@test.menurest.ru', loyaltyPoints: 80, loyaltyLevel: 'bronze' },
  { name: 'Максим Знаток', email: 'maxim.znatok@test.menurest.ru', loyaltyPoints: 45, loyaltyLevel: 'bronze' },
  { name: 'Татьяна Ценительница', email: 'tatiana.ценитель@test.menurest.ru', loyaltyPoints: 20, loyaltyLevel: 'bronze' },
];

async function seedLoyaltyUsers() {
  await dataSource.initialize();
  console.log('Seeding loyalty test users...');

  const userRepo = dataSource.getRepository('users');

  for (const u of testUsers) {
    const exists = await userRepo.findOneBy({ email: u.email });
    if (!exists) {
      await userRepo.save({
        ...u,
        passwordHash: '$2b$10$placeholder.hash.not.for.login',
        authProvider: 'email',
        role: 'user',
      });
      console.log(`  + ${u.name} (${u.loyaltyLevel}, ${u.loyaltyPoints} pts)`);
    } else {
      // Update points/level if user already exists
      await userRepo.update(exists.id, {
        loyaltyPoints: u.loyaltyPoints,
        loyaltyLevel: u.loyaltyLevel,
        name: u.name,
      });
      console.log(`  ~ ${u.name} updated`);
    }
  }

  console.log('Done! Loyalty test users seeded.');
  await dataSource.destroy();
}

seedLoyaltyUsers().catch((err) => {
  console.error('Error seeding loyalty users:', err);
  process.exit(1);
});
