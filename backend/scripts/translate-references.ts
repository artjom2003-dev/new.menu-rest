/**
 * Translate reference data (cuisines, features, allergens) to all supported languages.
 * Run: cd backend && npx ts-node scripts/translate-references.ts
 */
import 'reflect-metadata';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pgDS = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'menurest',
  username: process.env.DB_USER || 'menurest',
  password: process.env.DB_PASSWORD,
  synchronize: false,
  entities: [],
});

// ─── Cuisine translations ─────────────────────────────────────
const CUISINE_TR: Record<string, Record<string, string>> = {
  'Итальянская': { en: 'Italian', de: 'Italienisch', es: 'Italiana', fr: 'Italienne', zh: '意大利菜', ja: 'イタリア料理', ko: '이탈리안' },
  'Японская': { en: 'Japanese', de: 'Japanisch', es: 'Japonesa', fr: 'Japonaise', zh: '日本料理', ja: '日本料理', ko: '일식' },
  'Грузинская': { en: 'Georgian', de: 'Georgisch', es: 'Georgiana', fr: 'Géorgienne', zh: '格鲁吉亚菜', ja: 'ジョージア料理', ko: '조지아 요리' },
  'Французская': { en: 'French', de: 'Französisch', es: 'Francesa', fr: 'Française', zh: '法国菜', ja: 'フランス料理', ko: '프렌치' },
  'Русская': { en: 'Russian', de: 'Russisch', es: 'Rusa', fr: 'Russe', zh: '俄罗斯菜', ja: 'ロシア料理', ko: '러시아 요리' },
  'Узбекская': { en: 'Uzbek', de: 'Usbekisch', es: 'Uzbeka', fr: 'Ouzbek', zh: '乌兹别克菜', ja: 'ウズベキスタン料理', ko: '우즈벡 요리' },
  'Китайская': { en: 'Chinese', de: 'Chinesisch', es: 'China', fr: 'Chinoise', zh: '中餐', ja: '中華料理', ko: '중식' },
  'Индийская': { en: 'Indian', de: 'Indisch', es: 'India', fr: 'Indienne', zh: '印度菜', ja: 'インド料理', ko: '인도 요리' },
  'Американская': { en: 'American', de: 'Amerikanisch', es: 'Americana', fr: 'Américaine', zh: '美式', ja: 'アメリカ料理', ko: '아메리칸' },
  'Мексиканская': { en: 'Mexican', de: 'Mexikanisch', es: 'Mexicana', fr: 'Mexicaine', zh: '墨西哥菜', ja: 'メキシコ料理', ko: '멕시칸' },
  'Средиземноморская': { en: 'Mediterranean', de: 'Mediterran', es: 'Mediterránea', fr: 'Méditerranéenne', zh: '地中海菜', ja: '地中海料理', ko: '지중해 요리' },
  'Турецкая': { en: 'Turkish', de: 'Türkisch', es: 'Turca', fr: 'Turque', zh: '土耳其菜', ja: 'トルコ料理', ko: '터키 요리' },
  'Кавказская': { en: 'Caucasian', de: 'Kaukasisch', es: 'Caucásica', fr: 'Caucasienne', zh: '高加索菜', ja: 'コーカサス料理', ko: '코카서스 요리' },
  'Европейская': { en: 'European', de: 'Europäisch', es: 'Europea', fr: 'Européenne', zh: '欧洲菜', ja: 'ヨーロッパ料理', ko: '유럽 요리' },
  'Паназиатская': { en: 'Pan-Asian', de: 'Panasiatisch', es: 'Panasiática', fr: 'Pan-asiatique', zh: '泛亚洲菜', ja: 'パンアジア料理', ko: '범아시아 요리' },
  'Корейская': { en: 'Korean', de: 'Koreanisch', es: 'Coreana', fr: 'Coréenne', zh: '韩国菜', ja: '韓国料理', ko: '한식' },
  'Тайская': { en: 'Thai', de: 'Thailändisch', es: 'Tailandesa', fr: 'Thaïlandaise', zh: '泰国菜', ja: 'タイ料理', ko: '태국 요리' },
  'Вьетнамская': { en: 'Vietnamese', de: 'Vietnamesisch', es: 'Vietnamita', fr: 'Vietnamienne', zh: '越南菜', ja: 'ベトナム料理', ko: '베트남 요리' },
  'Испанская': { en: 'Spanish', de: 'Spanisch', es: 'Española', fr: 'Espagnole', zh: '西班牙菜', ja: 'スペイン料理', ko: '스페인 요리' },
  'Греческая': { en: 'Greek', de: 'Griechisch', es: 'Griega', fr: 'Grecque', zh: '希腊菜', ja: 'ギリシャ料理', ko: '그리스 요리' },
  'Арабская': { en: 'Arabic', de: 'Arabisch', es: 'Árabe', fr: 'Arabe', zh: '阿拉伯菜', ja: 'アラブ料理', ko: '아랍 요리' },
  'Армянская': { en: 'Armenian', de: 'Armenisch', es: 'Armenia', fr: 'Arménienne', zh: '亚美尼亚菜', ja: 'アルメニア料理', ko: '아르메니아 요리' },
  'Азербайджанская': { en: 'Azerbaijani', de: 'Aserbaidschanisch', es: 'Azerbaiyana', fr: 'Azerbaïdjanaise', zh: '阿塞拜疆菜', ja: 'アゼルバイジャン料理', ko: '아제르바이잔 요리' },
  'Татарская': { en: 'Tatar', de: 'Tatarisch', es: 'Tártara', fr: 'Tatare', zh: '鞑靼菜', ja: 'タタール料理', ko: '타타르 요리' },
  'Украинская': { en: 'Ukrainian', de: 'Ukrainisch', es: 'Ucraniana', fr: 'Ukrainienne', zh: '乌克兰菜', ja: 'ウクライナ料理', ko: '우크라이나 요리' },
  'Немецкая': { en: 'German', de: 'Deutsch', es: 'Alemana', fr: 'Allemande', zh: '德国菜', ja: 'ドイツ料理', ko: '독일 요리' },
  'Авторская': { en: 'Signature', de: 'Autorenküche', es: 'De autor', fr: "D'auteur", zh: '创意菜', ja: 'シグネチャー', ko: '시그니처' },
  'Азиатская': { en: 'Asian', de: 'Asiatisch', es: 'Asiática', fr: 'Asiatique', zh: '亚洲菜', ja: 'アジア料理', ko: '아시아 요리' },
  'Восточная': { en: 'Eastern', de: 'Orientalisch', es: 'Oriental', fr: 'Orientale', zh: '东方菜', ja: '東洋料理', ko: '동양 요리' },
  'Морепродукты': { en: 'Seafood', de: 'Meeresfrüchte', es: 'Mariscos', fr: 'Fruits de mer', zh: '海鲜', ja: 'シーフード', ko: '해산물' },
  'Стейкхаус': { en: 'Steakhouse', de: 'Steakhaus', es: 'Asador', fr: 'Steakhouse', zh: '牛排馆', ja: 'ステーキハウス', ko: '스테이크하우스' },
  'Вегетарианская': { en: 'Vegetarian', de: 'Vegetarisch', es: 'Vegetariana', fr: 'Végétarienne', zh: '素食', ja: 'ベジタリアン', ko: '채식' },
  'Фьюжн': { en: 'Fusion', de: 'Fusion', es: 'Fusión', fr: 'Fusion', zh: '融合菜', ja: 'フュージョン', ko: '퓨전' },
  'Домашняя': { en: 'Home-style', de: 'Hausmannskost', es: 'Casera', fr: 'Familiale', zh: '家常菜', ja: '家庭料理', ko: '가정식' },
  'Пиццерия': { en: 'Pizzeria', de: 'Pizzeria', es: 'Pizzería', fr: 'Pizzeria', zh: '披萨店', ja: 'ピッツェリア', ko: '피자' },
  'Суши': { en: 'Sushi', de: 'Sushi', es: 'Sushi', fr: 'Sushi', zh: '寿司', ja: '寿司', ko: '스시' },
  'Бургерная': { en: 'Burgers', de: 'Burger', es: 'Hamburguesas', fr: 'Burgers', zh: '汉堡店', ja: 'バーガー', ko: '버거' },
  'Кондитерская': { en: 'Pastry', de: 'Konditorei', es: 'Pastelería', fr: 'Pâtisserie', zh: '糕点', ja: 'パティスリー', ko: '페이스트리' },
  'Пекарня': { en: 'Bakery', de: 'Bäckerei', es: 'Panadería', fr: 'Boulangerie', zh: '面包店', ja: 'ベーカリー', ko: '베이커리' },
  'Шашлычная': { en: 'Grill house', de: 'Grillhaus', es: 'Parrilla', fr: 'Grillade', zh: '烧烤店', ja: 'グリルハウス', ko: '그릴 하우스' },
};

// ─── Feature translations ──────────────────────────────────────
const FEATURE_TR: Record<string, Record<string, string>> = {
  'Романтический ужин': { en: 'Romantic dinner', de: 'Romantisches Abendessen', es: 'Cena romántica', fr: 'Dîner romantique', zh: '浪漫晚餐', ja: 'ロマンチックディナー', ko: '로맨틱 디너' },
  'С друзьями': { en: 'With friends', de: 'Mit Freunden', es: 'Con amigos', fr: 'Entre amis', zh: '朋友聚餐', ja: '友人と', ko: '친구와 함께' },
  'С семьёй': { en: 'Family', de: 'Familie', es: 'En familia', fr: 'En famille', zh: '家庭聚餐', ja: '家族と', ko: '가족과 함께' },
  'Деловая встреча': { en: 'Business meeting', de: 'Geschäftstreffen', es: 'Reunión de negocios', fr: 'Repas d\'affaires', zh: '商务宴请', ja: 'ビジネスミーティング', ko: '비즈니스 미팅' },
  'Бизнес-ланч': { en: 'Business lunch', de: 'Business-Lunch', es: 'Almuerzo de negocios', fr: 'Déjeuner d\'affaires', zh: '商务午餐', ja: 'ビジネスランチ', ko: '비즈니스 런치' },
  'Wi-Fi': { en: 'Wi-Fi', de: 'WLAN', es: 'Wi-Fi', fr: 'Wi-Fi', zh: 'Wi-Fi', ja: 'Wi-Fi', ko: 'Wi-Fi' },
  'Терраса': { en: 'Terrace', de: 'Terrasse', es: 'Terraza', fr: 'Terrasse', zh: '露台', ja: 'テラス', ko: '테라스' },
  'Доставка': { en: 'Delivery', de: 'Lieferung', es: 'Entrega', fr: 'Livraison', zh: '外卖', ja: 'デリバリー', ko: '배달' },
  'Парковка': { en: 'Parking', de: 'Parkplatz', es: 'Aparcamiento', fr: 'Parking', zh: '停车场', ja: '駐車場', ko: '주차장' },
  'Детская комната': { en: 'Kids room', de: 'Kinderzimmer', es: 'Sala infantil', fr: 'Salle enfants', zh: '儿童区', ja: 'キッズルーム', ko: '키즈룸' },
  'Живая музыка': { en: 'Live music', de: 'Live-Musik', es: 'Música en vivo', fr: 'Musique live', zh: '现场音乐', ja: 'ライブ音楽', ko: '라이브 음악' },
  'Кальян': { en: 'Hookah', de: 'Shisha', es: 'Hookah', fr: 'Narguilé', zh: '水烟', ja: 'シーシャ', ko: '물담배' },
  'Банкетный зал': { en: 'Banquet hall', de: 'Bankettsaal', es: 'Salón de banquetes', fr: 'Salle de banquet', zh: '宴会厅', ja: '宴会場', ko: '연회장' },
  'Завтраки': { en: 'Breakfast', de: 'Frühstück', es: 'Desayunos', fr: 'Petit-déjeuner', zh: '早餐', ja: '朝食', ko: '아침 식사' },
  'VIP-зал': { en: 'VIP room', de: 'VIP-Raum', es: 'Sala VIP', fr: 'Salon VIP', zh: 'VIP包间', ja: 'VIPルーム', ko: 'VIP룸' },
  'Караоке': { en: 'Karaoke', de: 'Karaoke', es: 'Karaoke', fr: 'Karaoké', zh: '卡拉OK', ja: 'カラオケ', ko: '노래방' },
  'Спортивные трансляции': { en: 'Sports broadcasts', de: 'Sportübertragungen', es: 'Deportes en TV', fr: 'Retransmissions sportives', zh: '体育直播', ja: 'スポーツ中継', ko: '스포츠 중계' },
};

// ─── Allergen translations ─────────────────────────────────────
const ALLERGEN_TR: Record<string, Record<string, string>> = {
  'Глютен': { en: 'Gluten', de: 'Gluten', es: 'Gluten', fr: 'Gluten', zh: '麸质', ja: 'グルテン', ko: '글루텐' },
  'Ракообразные': { en: 'Crustaceans', de: 'Krebstiere', es: 'Crustáceos', fr: 'Crustacés', zh: '甲壳类', ja: '甲殻類', ko: '갑각류' },
  'Яйца': { en: 'Eggs', de: 'Eier', es: 'Huevos', fr: 'Œufs', zh: '鸡蛋', ja: '卵', ko: '달걀' },
  'Рыба': { en: 'Fish', de: 'Fisch', es: 'Pescado', fr: 'Poisson', zh: '鱼类', ja: '魚', ko: '생선' },
  'Арахис': { en: 'Peanuts', de: 'Erdnüsse', es: 'Cacahuetes', fr: 'Arachides', zh: '花生', ja: 'ピーナッツ', ko: '땅콩' },
  'Соя': { en: 'Soy', de: 'Soja', es: 'Soja', fr: 'Soja', zh: '大豆', ja: '大豆', ko: '대두' },
  'Молоко': { en: 'Milk', de: 'Milch', es: 'Leche', fr: 'Lait', zh: '牛奶', ja: '乳', ko: '우유' },
  'Орехи': { en: 'Tree nuts', de: 'Schalenfrüchte', es: 'Frutos secos', fr: 'Fruits à coque', zh: '坚果', ja: 'ナッツ', ko: '견과류' },
  'Сельдерей': { en: 'Celery', de: 'Sellerie', es: 'Apio', fr: 'Céleri', zh: '芹菜', ja: 'セロリ', ko: '셀러리' },
  'Горчица': { en: 'Mustard', de: 'Senf', es: 'Mostaza', fr: 'Moutarde', zh: '芥末', ja: 'マスタード', ko: '겨자' },
  'Кунжут': { en: 'Sesame', de: 'Sesam', es: 'Sésamo', fr: 'Sésame', zh: '芝麻', ja: 'ゴマ', ko: '참깨' },
  'Диоксид серы': { en: 'Sulphites', de: 'Sulfite', es: 'Sulfitos', fr: 'Sulfites', zh: '亚硫酸盐', ja: '亜硫酸塩', ko: '아황산염' },
  'Люпин': { en: 'Lupin', de: 'Lupinen', es: 'Altramuces', fr: 'Lupin', zh: '羽扇豆', ja: 'ルピナス', ko: '루핀' },
  'Моллюски': { en: 'Molluscs', de: 'Weichtiere', es: 'Moluscos', fr: 'Mollusques', zh: '软体动物', ja: '軟体動物', ko: '연체동물' },
};

async function run() {
  await pgDS.initialize();
  console.log('Connected');

  let updated = 0;

  // Cuisines
  const cuisines = await pgDS.query('SELECT id, name FROM cuisines');
  for (const c of cuisines) {
    const tr = CUISINE_TR[c.name];
    if (tr) {
      await pgDS.query('UPDATE cuisines SET translations = $1 WHERE id = $2', [JSON.stringify(tr), c.id]);
      updated++;
    }
  }
  console.log(`Cuisines: ${updated}/${cuisines.length} translated`);

  // Features
  updated = 0;
  const features = await pgDS.query('SELECT id, name FROM features');
  for (const f of features) {
    const tr = FEATURE_TR[f.name];
    if (tr) {
      await pgDS.query('UPDATE features SET translations = $1 WHERE id = $2', [JSON.stringify(tr), f.id]);
      updated++;
    }
  }
  console.log(`Features: ${updated}/${features.length} translated`);

  // Allergens
  updated = 0;
  const allergens = await pgDS.query('SELECT id, name FROM allergens');
  for (const a of allergens) {
    const tr = ALLERGEN_TR[a.name];
    if (tr) {
      await pgDS.query('UPDATE allergens SET translations = $1 WHERE id = $2', [JSON.stringify(tr), a.id]);
      updated++;
    }
  }
  console.log(`Allergens: ${updated}/${allergens.length} translated`);

  await pgDS.destroy();
  console.log('Done!');
}

run().catch(e => { console.error(e); process.exit(1); });
