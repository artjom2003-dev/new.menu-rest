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

// ─── Dish Categories & Subcategories ───

const categories: { slug: string; name: string; icon: string; sort: number; subcategories: { slug: string; name: string; sort: number }[] }[] = [
  {
    slug: 'appetizers', name: 'Закуски', icon: '🥗', sort: 1,
    subcategories: [
      { slug: 'cold_appetizers', name: 'Холодные закуски', sort: 1 },
      { slug: 'hot_appetizers', name: 'Горячие закуски', sort: 2 },
      { slug: 'snacks', name: 'Снеки', sort: 3 },
      { slug: 'bruschetta', name: 'Брускетты', sort: 4 },
      { slug: 'carpaccio', name: 'Карпаччо и тартар', sort: 5 },
      { slug: 'pate', name: 'Паштеты и террины', sort: 6 },
      { slug: 'antipasti', name: 'Антипасти', sort: 7 },
      { slug: 'cheese_plate', name: 'Сырная тарелка', sort: 8 },
    ],
  },
  {
    slug: 'salads', name: 'Салаты', icon: '🥬', sort: 2,
    subcategories: [
      { slug: 'green_salads', name: 'Зелёные салаты', sort: 1 },
      { slug: 'warm_salads', name: 'Тёплые салаты', sort: 2 },
      { slug: 'caesar', name: 'Цезарь', sort: 3 },
      { slug: 'seafood_salads', name: 'Салаты с морепродуктами', sort: 4 },
      { slug: 'meat_salads', name: 'Мясные салаты', sort: 5 },
      { slug: 'vegetable_salads', name: 'Овощные салаты', sort: 6 },
    ],
  },
  {
    slug: 'soups', name: 'Супы', icon: '🍜', sort: 3,
    subcategories: [
      { slug: 'cream_soups', name: 'Крем-супы', sort: 1 },
      { slug: 'clear_soups', name: 'Прозрачные супы', sort: 2 },
      { slug: 'cold_soups', name: 'Холодные супы', sort: 3 },
      { slug: 'borsch', name: 'Борщ', sort: 4 },
      { slug: 'solyanka', name: 'Солянка', sort: 5 },
      { slug: 'ukha', name: 'Уха', sort: 6 },
      { slug: 'ramen', name: 'Рамен', sort: 7 },
      { slug: 'pho', name: 'Фо', sort: 8 },
      { slug: 'tom_yum', name: 'Том-Ям', sort: 9 },
    ],
  },
  {
    slug: 'main_courses', name: 'Горячее', icon: '🍖', sort: 4,
    subcategories: [
      { slug: 'steaks', name: 'Стейки', sort: 1 },
      { slug: 'poultry', name: 'Птица', sort: 2 },
      { slug: 'fish_main', name: 'Рыба', sort: 3 },
      { slug: 'seafood_main', name: 'Морепродукты', sort: 4 },
      { slug: 'pork_main', name: 'Свинина', sort: 5 },
      { slug: 'lamb_main', name: 'Баранина', sort: 6 },
      { slug: 'veal_main', name: 'Телятина', sort: 7 },
      { slug: 'offal', name: 'Субпродукты', sort: 8 },
      { slug: 'vegetarian_main', name: 'Вегетарианское горячее', sort: 9 },
    ],
  },
  {
    slug: 'pasta', name: 'Паста и ризотто', icon: '🍝', sort: 5,
    subcategories: [
      { slug: 'spaghetti', name: 'Спагетти', sort: 1 },
      { slug: 'penne', name: 'Пенне', sort: 2 },
      { slug: 'tagliatelle', name: 'Тальятелле', sort: 3 },
      { slug: 'lasagna', name: 'Лазанья', sort: 4 },
      { slug: 'ravioli', name: 'Равиоли', sort: 5 },
      { slug: 'risotto', name: 'Ризотто', sort: 6 },
      { slug: 'gnocchi', name: 'Ньокки', sort: 7 },
    ],
  },
  {
    slug: 'dumplings', name: 'Пельмени и вареники', icon: '🥟', sort: 6,
    subcategories: [
      { slug: 'pelmeni', name: 'Пельмени', sort: 1 },
      { slug: 'vareniki', name: 'Вареники', sort: 2 },
      { slug: 'khinkali', name: 'Хинкали', sort: 3 },
      { slug: 'manti', name: 'Манты', sort: 4 },
      { slug: 'gyoza', name: 'Гёдза', sort: 5 },
      { slug: 'dim_sum', name: 'Дим-самы', sort: 6 },
    ],
  },
  {
    slug: 'asian', name: 'Азиатская кухня', icon: '🍱', sort: 7,
    subcategories: [
      { slug: 'sushi', name: 'Суши', sort: 1 },
      { slug: 'rolls', name: 'Роллы', sort: 2 },
      { slug: 'sashimi', name: 'Сашими', sort: 3 },
      { slug: 'wok_dishes', name: 'Вок', sort: 4 },
      { slug: 'curry', name: 'Карри', sort: 5 },
      { slug: 'pad_thai', name: 'Пад-тай', sort: 6 },
      { slug: 'bibimbap', name: 'Пибимпап', sort: 7 },
      { slug: 'poke', name: 'Поке', sort: 8 },
      { slug: 'bao', name: 'Бао', sort: 9 },
    ],
  },
  {
    slug: 'grill', name: 'Гриль и BBQ', icon: '🔥', sort: 8,
    subcategories: [
      { slug: 'kebab', name: 'Шашлык', sort: 1 },
      { slug: 'ribs', name: 'Рёбра', sort: 2 },
      { slug: 'burgers', name: 'Бургеры', sort: 3 },
      { slug: 'grilled_fish', name: 'Рыба на гриле', sort: 4 },
      { slug: 'grilled_vegs', name: 'Овощи на гриле', sort: 5 },
      { slug: 'wings', name: 'Крылышки', sort: 6 },
      { slug: 'sausages', name: 'Колбаски', sort: 7 },
    ],
  },
  {
    slug: 'pizza', name: 'Пицца', icon: '🍕', sort: 9,
    subcategories: [
      { slug: 'classic_pizza', name: 'Классическая', sort: 1 },
      { slug: 'meat_pizza', name: 'Мясная', sort: 2 },
      { slug: 'seafood_pizza', name: 'С морепродуктами', sort: 3 },
      { slug: 'vegetarian_pizza', name: 'Вегетарианская', sort: 4 },
      { slug: 'calzone', name: 'Кальцоне', sort: 5 },
      { slug: 'focaccia', name: 'Фокачча', sort: 6 },
    ],
  },
  {
    slug: 'sides', name: 'Гарниры', icon: '🍚', sort: 10,
    subcategories: [
      { slug: 'potatoes', name: 'Картофель', sort: 1 },
      { slug: 'rice', name: 'Рис', sort: 2 },
      { slug: 'vegetables', name: 'Овощи', sort: 3 },
      { slug: 'noodles', name: 'Лапша', sort: 4 },
      { slug: 'grains', name: 'Крупы', sort: 5 },
    ],
  },
  {
    slug: 'bakery', name: 'Выпечка', icon: '🥐', sort: 11,
    subcategories: [
      { slug: 'bread', name: 'Хлеб', sort: 1 },
      { slug: 'pies', name: 'Пироги', sort: 2 },
      { slug: 'croissants', name: 'Круассаны', sort: 3 },
      { slug: 'flatbreads', name: 'Лепёшки', sort: 4 },
      { slug: 'pastries', name: 'Булочки', sort: 5 },
      { slug: 'khachapuri', name: 'Хачапури', sort: 6 },
    ],
  },
  {
    slug: 'desserts', name: 'Десерты', icon: '🍰', sort: 12,
    subcategories: [
      { slug: 'cakes', name: 'Торты', sort: 1 },
      { slug: 'ice_cream', name: 'Мороженое', sort: 2 },
      { slug: 'mousse', name: 'Муссы и суфле', sort: 3 },
      { slug: 'cheesecake', name: 'Чизкейк', sort: 4 },
      { slug: 'tiramisu', name: 'Тирамису', sort: 5 },
      { slug: 'pancakes_dessert', name: 'Блинчики', sort: 6 },
      { slug: 'fruit_desserts', name: 'Фруктовые десерты', sort: 7 },
      { slug: 'chocolate', name: 'Шоколадные десерты', sort: 8 },
    ],
  },
  {
    slug: 'drinks', name: 'Напитки', icon: '🥤', sort: 13,
    subcategories: [
      { slug: 'coffee', name: 'Кофе', sort: 1 },
      { slug: 'tea', name: 'Чай', sort: 2 },
      { slug: 'fresh_juice', name: 'Свежевыжатые соки', sort: 3 },
      { slug: 'smoothies', name: 'Смузи', sort: 4 },
      { slug: 'lemonade', name: 'Лимонады', sort: 5 },
      { slug: 'soft_drinks', name: 'Безалкогольные', sort: 6 },
      { slug: 'cocktails', name: 'Коктейли', sort: 7 },
      { slug: 'wine', name: 'Вино', sort: 8 },
      { slug: 'beer', name: 'Пиво', sort: 9 },
      { slug: 'spirits', name: 'Крепкие напитки', sort: 10 },
    ],
  },
  {
    slug: 'breakfast', name: 'Завтраки', icon: '🍳', sort: 14,
    subcategories: [
      { slug: 'eggs', name: 'Блюда из яиц', sort: 1 },
      { slug: 'porridge', name: 'Каши', sort: 2 },
      { slug: 'pancakes', name: 'Блины и оладьи', sort: 3 },
      { slug: 'granola', name: 'Гранола и мюсли', sort: 4 },
      { slug: 'sandwiches', name: 'Сэндвичи и тосты', sort: 5 },
      { slug: 'english_breakfast', name: 'Английский завтрак', sort: 6 },
    ],
  },
  {
    slug: 'kids', name: 'Детское меню', icon: '👶', sort: 15,
    subcategories: [
      { slug: 'kids_soups', name: 'Детские супы', sort: 1 },
      { slug: 'kids_main', name: 'Детские горячие', sort: 2 },
      { slug: 'kids_pasta', name: 'Детская паста', sort: 3 },
      { slug: 'kids_desserts', name: 'Детские десерты', sort: 4 },
      { slug: 'kids_drinks', name: 'Детские напитки', sort: 5 },
    ],
  },
];

// ─── Cooking Methods ───

const cookingMethods = [
  { slug: 'fried', name: 'Жареное' },
  { slug: 'grilled', name: 'На гриле' },
  { slug: 'baked', name: 'Запечённое' },
  { slug: 'boiled', name: 'Варёное' },
  { slug: 'steamed', name: 'На пару' },
  { slug: 'stewed', name: 'Тушёное' },
  { slug: 'raw', name: 'Сырое' },
  { slug: 'smoked', name: 'Копчёное' },
  { slug: 'deep_fried', name: 'Во фритюре' },
  { slug: 'sous_vide', name: 'Су-вид' },
  { slug: 'charcoal', name: 'На углях' },
  { slug: 'braised', name: 'Томлёное' },
  { slug: 'wok', name: 'В воке' },
  { slug: 'marinated', name: 'Маринованное' },
  { slug: 'fermented', name: 'Ферментированное' },
];

// ─── Protein Types ───

const proteinTypes: { slug: string; name: string; is_meat: boolean; is_seafood: boolean }[] = [
  { slug: 'beef', name: 'Говядина', is_meat: true, is_seafood: false },
  { slug: 'pork', name: 'Свинина', is_meat: true, is_seafood: false },
  { slug: 'lamb', name: 'Баранина', is_meat: true, is_seafood: false },
  { slug: 'chicken', name: 'Курица', is_meat: true, is_seafood: false },
  { slug: 'duck', name: 'Утка', is_meat: true, is_seafood: false },
  { slug: 'turkey', name: 'Индейка', is_meat: true, is_seafood: false },
  { slug: 'white_fish', name: 'Белая рыба', is_meat: false, is_seafood: true },
  { slug: 'red_fish', name: 'Красная рыба', is_meat: false, is_seafood: true },
  { slug: 'salmon', name: 'Лосось', is_meat: false, is_seafood: true },
  { slug: 'tuna', name: 'Тунец', is_meat: false, is_seafood: true },
  { slug: 'shrimp', name: 'Креветки', is_meat: false, is_seafood: true },
  { slug: 'squid', name: 'Кальмар', is_meat: false, is_seafood: true },
  { slug: 'octopus', name: 'Осьминог', is_meat: false, is_seafood: true },
  { slug: 'crab', name: 'Краб', is_meat: false, is_seafood: true },
  { slug: 'mussels', name: 'Мидии', is_meat: false, is_seafood: true },
  { slug: 'tofu', name: 'Тофу', is_meat: false, is_seafood: false },
  { slug: 'none', name: 'Без белка', is_meat: false, is_seafood: false },
];

// ─── Flavor Profiles ───

const flavorProfiles: { slug: string; name: string; taste_sweet: number; taste_sour: number; taste_salty: number; taste_spicy: number }[] = [
  { slug: 'sweet_sour', name: 'Кисло-сладкий', taste_sweet: 6, taste_sour: 6, taste_salty: 2, taste_spicy: 1 },
  { slug: 'spicy', name: 'Острый', taste_sweet: 0, taste_sour: 1, taste_salty: 3, taste_spicy: 9 },
  { slug: 'salty', name: 'Солёный', taste_sweet: 0, taste_sour: 1, taste_salty: 8, taste_spicy: 0 },
  { slug: 'savory', name: 'Пряный', taste_sweet: 1, taste_sour: 1, taste_salty: 4, taste_spicy: 4 },
  { slug: 'sweet', name: 'Сладкий', taste_sweet: 9, taste_sour: 1, taste_salty: 0, taste_spicy: 0 },
  { slug: 'sour', name: 'Кислый', taste_sweet: 1, taste_sour: 8, taste_salty: 1, taste_spicy: 0 },
  { slug: 'umami', name: 'Умами', taste_sweet: 2, taste_sour: 1, taste_salty: 5, taste_spicy: 1 },
  { slug: 'teriyaki', name: 'Терияки', taste_sweet: 6, taste_sour: 2, taste_salty: 5, taste_spicy: 1 },
  { slug: 'garlic', name: 'Чесночный', taste_sweet: 1, taste_sour: 0, taste_salty: 3, taste_spicy: 3 },
  { slug: 'creamy', name: 'Сливочный', taste_sweet: 3, taste_sour: 1, taste_salty: 2, taste_spicy: 0 },
  { slug: 'citrus', name: 'Цитрусовый', taste_sweet: 3, taste_sour: 7, taste_salty: 1, taste_spicy: 0 },
  { slug: 'smoky', name: 'Дымный', taste_sweet: 1, taste_sour: 0, taste_salty: 4, taste_spicy: 2 },
];

// ─── Dish Tags ───

const dishTags: { slug: string; name: string; tag_type: string; icon: string }[] = [
  // dietary
  { slug: 'vegetarian', name: 'Вегетарианское', tag_type: 'dietary', icon: '🌿' },
  { slug: 'vegan', name: 'Веганское', tag_type: 'dietary', icon: '🌱' },
  { slug: 'gluten_free', name: 'Без глютена', tag_type: 'dietary', icon: '🌾' },
  { slug: 'lactose_free', name: 'Без лактозы', tag_type: 'dietary', icon: '🥛' },
  { slug: 'keto', name: 'Кето', tag_type: 'dietary', icon: '🥑' },
  { slug: 'low_calorie', name: 'Низкокалорийное', tag_type: 'dietary', icon: '🍃' },
  { slug: 'halal', name: 'Халяль', tag_type: 'dietary', icon: '☪️' },
  { slug: 'kosher', name: 'Кошер', tag_type: 'dietary', icon: '✡️' },
  // occasion
  { slug: 'kids_friendly', name: 'Детям', tag_type: 'occasion', icon: '👶' },
  { slug: 'romantic', name: 'Романтика', tag_type: 'occasion', icon: '💕' },
  { slug: 'business_lunch', name: 'Бизнес-ланч', tag_type: 'occasion', icon: '💼' },
  { slug: 'takeaway', name: 'Навынос', tag_type: 'occasion', icon: '📦' },
  { slug: 'banquet', name: 'Банкет', tag_type: 'occasion', icon: '🎊' },
  // style
  { slug: 'signature', name: 'Авторское', tag_type: 'style', icon: '⭐' },
  { slug: 'classic', name: 'Классика', tag_type: 'style', icon: '👨‍🍳' },
  { slug: 'fusion', name: 'Фьюжн', tag_type: 'style', icon: '🌍' },
  { slug: 'street_food', name: 'Стрит-фуд', tag_type: 'style', icon: '🛒' },
  { slug: 'comfort_food', name: 'Комфорт-фуд', tag_type: 'style', icon: '🏠' },
  // temperature
  { slug: 'hot', name: 'Горячее', tag_type: 'temperature', icon: '🔥' },
  { slug: 'cold', name: 'Холодное', tag_type: 'temperature', icon: '❄️' },
  { slug: 'room_temp', name: 'Комнатной температуры', tag_type: 'temperature', icon: '🌡️' },
];

// ─── Main ───

async function seedMenuTaxonomy() {
  await dataSource.initialize();
  console.log('Seeding menu taxonomy...');

  // 1. Dish categories & subcategories
  for (const cat of categories) {
    await dataSource.query(
      `INSERT INTO "dish_categories" ("name", "slug", "icon", "sort_order")
       VALUES ($1, $2, $3, $4)
       ON CONFLICT ("slug") DO UPDATE SET "name" = $1, "icon" = $3, "sort_order" = $4`,
      [cat.name, cat.slug, cat.icon, cat.sort],
    );

    const [{ id: categoryId }] = await dataSource.query(
      `SELECT "id" FROM "dish_categories" WHERE "slug" = $1`,
      [cat.slug],
    );

    for (const sub of cat.subcategories) {
      await dataSource.query(
        `INSERT INTO "dish_subcategories" ("category_id", "name", "slug", "sort_order")
         VALUES ($1, $2, $3, $4)
         ON CONFLICT ("category_id", "slug") DO UPDATE SET "name" = $2, "sort_order" = $4`,
        [categoryId, sub.name, sub.slug, sub.sort],
      );
    }
  }
  console.log(`  dish_categories: ${categories.length}`);
  console.log(`  dish_subcategories: ${categories.reduce((s, c) => s + c.subcategories.length, 0)}`);

  // 2. Cooking methods
  for (const m of cookingMethods) {
    await dataSource.query(
      `INSERT INTO "cooking_methods" ("name", "slug")
       VALUES ($1, $2)
       ON CONFLICT ("slug") DO UPDATE SET "name" = $1`,
      [m.name, m.slug],
    );
  }
  console.log(`  cooking_methods: ${cookingMethods.length}`);

  // 3. Protein types
  for (const p of proteinTypes) {
    await dataSource.query(
      `INSERT INTO "protein_types" ("name", "slug", "is_meat", "is_seafood")
       VALUES ($1, $2, $3, $4)
       ON CONFLICT ("slug") DO UPDATE SET "name" = $1, "is_meat" = $3, "is_seafood" = $4`,
      [p.name, p.slug, p.is_meat, p.is_seafood],
    );
  }
  console.log(`  protein_types: ${proteinTypes.length}`);

  // 4. Flavor profiles
  for (const f of flavorProfiles) {
    await dataSource.query(
      `INSERT INTO "flavor_profiles" ("name", "slug", "taste_sweet", "taste_sour", "taste_salty", "taste_spicy")
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT ("slug") DO UPDATE SET "name" = $1, "taste_sweet" = $3, "taste_sour" = $4, "taste_salty" = $5, "taste_spicy" = $6`,
      [f.name, f.slug, f.taste_sweet, f.taste_sour, f.taste_salty, f.taste_spicy],
    );
  }
  console.log(`  flavor_profiles: ${flavorProfiles.length}`);

  // 5. Dish tags
  for (const t of dishTags) {
    await dataSource.query(
      `INSERT INTO "dish_tags" ("name", "slug", "tag_type", "icon")
       VALUES ($1, $2, $3, $4)
       ON CONFLICT ("slug") DO UPDATE SET "name" = $1, "tag_type" = $3, "icon" = $4`,
      [t.name, t.slug, t.tag_type, t.icon],
    );
  }
  console.log(`  dish_tags: ${dishTags.length}`);

  console.log('Menu taxonomy seeding complete!');
  await dataSource.destroy();
}

seedMenuTaxonomy().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
