import type { MenuCategory, MenuDish } from '@menurest/shared-types';

export const MOCK_RESTAURANT = {
  id: 13269,
  slug: 'chuck',
  name: 'Chuck',
  logo: 'https://img.restoclub.ru/uploads/place/9/3/2/7/9327a06f9790733d75de71e30bad96c9_w1230_h820--no-cut.webp',
};

const dishes: MenuDish[] = [
  { id: 1, name: 'Чак Ролл стейк', description: 'Сочный стейк из чак ролла, medium rare', categoryName: 'Стейки', price: 1999, weightGrams: 300, calories: 650, protein: 48, fat: 42, carbs: 0, isAvailable: true, prepTimeMin: 20, station: 'hot' },
  { id: 2, name: 'Рибай стейк', description: 'Мраморная говядина, выдержка 28 дней', categoryName: 'Стейки', price: 2222, weightGrams: 350, calories: 780, protein: 52, fat: 58, carbs: 0, isAvailable: true, prepTimeMin: 25, station: 'hot' },
  { id: 3, name: 'Нью-Йорк стейк', description: 'Стриплойн премиум класса', categoryName: 'Стейки', price: 2555, weightGrams: 320, calories: 720, protein: 50, fat: 50, carbs: 0, isAvailable: true, prepTimeMin: 22, station: 'hot' },
  { id: 4, name: 'Денвер стейк', description: 'Нежный стейк из лопатки', categoryName: 'Стейки', price: 1999, weightGrams: 280, calories: 580, protein: 45, fat: 38, carbs: 0, isAvailable: false, prepTimeMin: 18, station: 'hot' },

  { id: 10, name: 'CHUCK Бургер', description: 'Фирменный бургер с двойной котлетой и соусом BBQ', categoryName: 'Бургеры', price: 999, weightGrams: 350, calories: 850, protein: 42, fat: 48, carbs: 55, isAvailable: true, prepTimeMin: 15, station: 'hot' },
  { id: 11, name: 'Big Fatty Burger', description: 'Тройная котлета, бекон, чеддер, халапеньо', categoryName: 'Бургеры', price: 1555, weightGrams: 480, calories: 1200, protein: 58, fat: 72, carbs: 60, isAvailable: true, prepTimeMin: 18, station: 'hot' },
  { id: 12, name: 'Брискет Бургер', description: 'С копчёным брискетом и коулслоу', categoryName: 'Бургеры', price: 999, weightGrams: 380, calories: 920, protein: 45, fat: 52, carbs: 58, isAvailable: true, prepTimeMin: 15, station: 'hot' },

  { id: 20, name: 'Брискет', description: 'Говяжья грудинка 12 часов копчения', categoryName: 'Smoky Chuck', price: 2222, weightGrams: 300, calories: 680, protein: 55, fat: 45, carbs: 0, isAvailable: true, prepTimeMin: 5, station: 'hot' },
  { id: 21, name: 'Говяжьи рёбра', description: 'В кленовом сиропе, длительного копчения', categoryName: 'Smoky Chuck', price: 1777, weightGrams: 400, calories: 750, protein: 48, fat: 52, carbs: 8, isAvailable: true, prepTimeMin: 5, station: 'hot' },
  { id: 22, name: 'Свиные рёбра', description: 'С фирменным BBQ соусом', categoryName: 'Smoky Chuck', price: 1111, weightGrams: 450, calories: 820, protein: 42, fat: 58, carbs: 12, isAvailable: true, prepTimeMin: 5, station: 'hot' },
  { id: 23, name: 'Смоки Баскет', description: 'Ассорти: брискет, рёбра, колбаски', categoryName: 'Smoky Chuck', price: 3555, weightGrams: 800, calories: 1800, protein: 95, fat: 120, carbs: 20, isAvailable: true, prepTimeMin: 8, station: 'hot' },

  { id: 30, name: 'Крылышки Hot', description: 'Острые куриные крылья в соусе Buffalo', categoryName: 'Закуски', price: 888, weightGrams: 300, calories: 520, protein: 35, fat: 32, carbs: 15, isAvailable: true, prepTimeMin: 12, station: 'hot', allergens: ['глютен'] },
  { id: 31, name: 'Чили начос', description: 'Кукурузные чипсы, чили кон карне, чеддер', categoryName: 'Закуски', price: 777, weightGrams: 280, calories: 480, protein: 22, fat: 28, carbs: 42, isAvailable: true, prepTimeMin: 10, station: 'cold' },

  { id: 40, name: 'Цезарь с курицей', description: 'Романо, пармезан, куриное филе гриль', categoryName: 'Салаты', price: 399, weightGrams: 250, calories: 320, protein: 28, fat: 18, carbs: 12, isAvailable: true, prepTimeMin: 8, station: 'cold' },
  { id: 41, name: 'Овощной салат', description: 'Свежие сезонные овощи с оливковым маслом', categoryName: 'Салаты', price: 499, weightGrams: 220, calories: 180, protein: 5, fat: 12, carbs: 15, isAvailable: true, prepTimeMin: 5, station: 'cold' },

  { id: 50, name: 'Картофельное пюре', description: 'С трюфельным маслом', categoryName: 'Гарниры', price: 520, weightGrams: 200, calories: 280, protein: 5, fat: 14, carbs: 35, isAvailable: true, prepTimeMin: 5, station: 'hot' },
  { id: 51, name: 'Овощи гриль', description: 'С бальзамической глазурью', categoryName: 'Гарниры', price: 520, weightGrams: 220, calories: 150, protein: 4, fat: 8, carbs: 18, isAvailable: true, prepTimeMin: 8, station: 'hot' },

  { id: 60, name: 'Чизкейк', description: 'Классический нью-йоркский с ягодным соусом', categoryName: 'Десерты', price: 550, weightGrams: 150, calories: 420, protein: 8, fat: 28, carbs: 38, isAvailable: true, prepTimeMin: 3, station: 'pastry', allergens: ['молоко', 'глютен'] },
  { id: 61, name: 'Тирамису', description: 'Итальянский рецепт с маскарпоне', categoryName: 'Десерты', price: 550, weightGrams: 140, calories: 380, protein: 7, fat: 22, carbs: 40, isAvailable: true, prepTimeMin: 3, station: 'pastry', allergens: ['молоко', 'яйцо'] },

  { id: 70, name: 'Lager 520ml', description: 'Светлое разливное', categoryName: 'Пиво', price: 520, volumeMl: 520, isAvailable: true, station: 'bar' },
  { id: 71, name: 'IPA 520ml', description: 'Крафтовый India Pale Ale', categoryName: 'Пиво', price: 520, volumeMl: 520, isAvailable: true, station: 'bar' },
  { id: 72, name: 'Aperol Spritz', description: 'Классический итальянский аперитив', categoryName: 'Коктейли', price: 690, volumeMl: 200, isAvailable: true, station: 'bar' },
  { id: 73, name: 'Mojito', description: 'Ром, лайм, мята, содовая', categoryName: 'Коктейли', price: 690, volumeMl: 300, isAvailable: true, station: 'bar' },
  { id: 74, name: 'Bloody Mary', description: 'Водка, томатный сок, специи', categoryName: 'Коктейли', price: 720, volumeMl: 350, isAvailable: true, station: 'bar' },

  { id: 80, name: 'Домашний лимонад', description: 'Лимон, мята, тростниковый сахар', categoryName: 'Напитки', price: 420, volumeMl: 400, isAvailable: true, station: 'bar' },
  { id: 81, name: 'Coca-Cola', categoryName: 'Напитки', price: 450, volumeMl: 330, isAvailable: true, station: 'bar' },
  { id: 82, name: 'Капучино', description: 'Двойной эспрессо с молочной пенкой', categoryName: 'Напитки', price: 200, volumeMl: 250, isAvailable: true, station: 'bar' },
];

export const MOCK_CATEGORIES: MenuCategory[] = [];
const catMap = new Map<string, MenuDish[]>();
for (const d of dishes) {
  if (!catMap.has(d.categoryName)) catMap.set(d.categoryName, []);
  catMap.get(d.categoryName)!.push(d);
}
for (const [name, items] of catMap) {
  MOCK_CATEGORIES.push({ name, dishes: items });
}
