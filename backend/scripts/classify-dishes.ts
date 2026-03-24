/**
 * Keyword-based dish classification.
 * Maps existing dishes to new taxonomy (categories, subcategories, protein, tags).
 * Fast, free, no LLM needed. Covers ~70-80% of dishes.
 *
 * Run: cd backend && npx ts-node scripts/classify-dishes.ts
 */
import 'reflect-metadata';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const ds = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'menurest',
  username: process.env.DB_USER || 'menurest',
  password: process.env.DB_PASSWORD,
  synchronize: false,
  entities: [],
});

// ─── Category mapping: old category_name → new category slug ───
const CATEGORY_MAP: Record<string, string> = {
  'Салаты': 'salads',
  'Супы': 'soups',
  'Десерты': 'desserts',
  'Напитки безалкогольные': 'drinks',
  'Алкоголь': 'drinks',
  'Вино': 'drinks',
  'Пиво': 'drinks',
  'Чай и кофе': 'drinks',
  'Напитки': 'drinks',
  'Гарниры': 'sides',
  'Закуски': 'appetizers',
  'Горячее': 'main_courses',
  'Морепродукты': 'main_courses',
  'Рыба и морепродукты': 'main_courses',
  'Стейки и гриль': 'grill',
  'Мясо и птица': 'main_courses',
  'Паста': 'pasta',
  'Хлеб и выпечка': 'bakery',
  'Суши и роллы': 'asian',
  'Пицца': 'pizza',
  'Соусы': 'sides',
  'Бургеры': 'grill',
  'Завтраки': 'breakfast',
  'Детское меню': 'kids',
  'Лапша Wok': 'asian',
  'Азиатская кухня': 'asian',
  'Лапша и рис': 'asian',
  'Дополнительно': 'sides',
  'Другое': 'main_courses',
};

// ─── Keyword-based category detection from dish name (overrides broken categoryName) ───
const NAME_CATEGORY_PATTERNS: Array<{ slug: string; pattern: RegExp }> = [
  // Sauces — must be before everything else
  { slug: 'sides', pattern: /^(соус|барбекю|чесночный|цезарь|тартар|сырный|сметан|кетчуп|горчиц|майонез|васаби|имбирь|терияки|песто|айоли|ткемали|аджик|наршараб|гранатов.*соус)\s*$/i },
  { slug: 'sides', pattern: /\bсоус\b.*(?:\d+\s*(?:гр?|мл))?$/i },
  // Bread & additions
  { slug: 'bakery', pattern: /^(чиабатт|хлеб|лаваш|лепёшк|лепешк|фокачч|пита|булочк|багет|тост)\b/i },
  // Cutlery and non-food
  { slug: 'sides', pattern: /^(без приборов|приборы|палочки|детские палочки|салфетк)/i },
  // Soups
  { slug: 'soups', pattern: /суп|солянк|борщ|щи\b|уха\b|том\s*ям|рассольник|окрошк|гаспач|минестроне|фо\s+бо|рамен|рамён|бульон|крем[\s-]суп/i },
  // Salads
  { slug: 'salads', pattern: /салат/i },
  // Sushi/Rolls
  { slug: 'asian', pattern: /суши|ролл|сашими|нигири|гункан|маки\b|урамаки|темаки/i },
  // Wok/Noodles
  { slug: 'asian', pattern: /\bвок\b|wok|рамен|пад тай|лапша\b.*(?:удон|соба|рисов|яичн)|удон\b|соба\b/i },
  // Dim sum / dumplings
  { slug: 'dumplings', pattern: /дим[\s-]?сам|пельмен|хинкал|манты|буузы|позы|гёдза|гедза|вареник|чучвара|вонтон/i },
  // Pizza
  { slug: 'pizza', pattern: /пицц/i },
  // Pasta
  { slug: 'pasta', pattern: /паста|спагетти|карбонар|болоньез|лазань|равиоли|ризотто|пенне|тальятел|феттучин|ньокки|фетучин/i },
  // Burgers / Grill
  { slug: 'grill', pattern: /бургер|стейк(?!ан)|шашлык|люля|кебаб|рёбр|ребрыш/i },
  // Desserts
  { slug: 'desserts', pattern: /десерт|торт|чизкейк|тирамису|панна\s*котт|мороженое|пломбир|сорбет|пирожн|эклер|макарон|брауни|штрудель|медовик|наполеон/i },
  // Breakfast
  { slug: 'breakfast', pattern: /яичниц|омлет|скрэмбл|пашот|бенедикт|шакшук|каша|овсянк|гранол|сырник|завтрак/i },
  // Drinks
  { slug: 'drinks', pattern: /кофе|капучин|латте|эспрессо|американо|раф\b|чай\b|лимонад|смузи|сок\b|морс|компот|коктейл|мохит|виски|водка|коньяк|пив[оа]\b|вин[оа]\b/i },
  // Bakery
  { slug: 'bakery', pattern: /хачапур|самса|чебурек|пирог|пирожок|круассан|блин[ыч]/i },
  // Kids
  { slug: 'kids', pattern: /детск/i },
];

// ─── Subcategory keyword patterns ───
const SUBCATEGORY_PATTERNS: Array<{ slug: string; patterns: RegExp }> = [
  // Salads
  { slug: 'classic_salads', patterns: /цезарь|оливье|греческ|шуба|мимоз|винегрет|нисуаз/i },
  { slug: 'warm_salads', patterns: /тёпл|теплый|тёплый|warm/i },
  { slug: 'seafood_salads', patterns: /с\s*(креветк|кальмар|осьминог|краб|мидии|тунц|лосос|рыб)/i },
  { slug: 'meat_salads', patterns: /с\s*(куриц|говядин|утк|инде|мяс|бекон|ветчин)/i },
  // Soups
  { slug: 'cream_soups', patterns: /крем[\s-]?суп|суп[\s-]?крем|крем из|велюте/i },
  { slug: 'broths', patterns: /бульон|бульён|консоме/i },
  { slug: 'cold_soups', patterns: /гаспач|холодн.*суп|окрошк|свеколь|суп.*холод/i },
  { slug: 'fish_soups', patterns: /уха|рыбн.*суп|суп.*рыб|том ям|буйабес/i },
  // Main courses
  { slug: 'beef', patterns: /говядин|стейк.*из.*говядин|филе.*миньон|рибай|стриплойн|антрекот|тартар.*из.*говядин|медальон.*из.*говядин|оссобук/i },
  { slug: 'pork', patterns: /свинин|свиная|свиной|каре.*свин|рулька|шницель.*из.*свин/i },
  { slug: 'lamb', patterns: /баранин|баранья|баранье|каре.*бара|ягнёнок|ягнятин/i },
  { slug: 'poultry', patterns: /курин|куриц|цыплён|утк|утин|индейк|индюш|перепел/i },
  { slug: 'fish', patterns: /сёмг|лосос|форел|судак|дорад|сибас|палтус|треск|щук|карп|осётр|стерляд|тунец|окунь|минтай/i },
  { slug: 'seafood', patterns: /креветк|кальмар|осьминог|мидии|гребешок|устриц|лангустин|краб|лобстер|омар/i },
  // Asian
  { slug: 'sushi', patterns: /суши|нигири|гунка/i },
  { slug: 'rolls', patterns: /ролл|маки|урамаки|филадельфи|калифорни|дракон|темпур.*ролл/i },
  { slug: 'sashimi', patterns: /сашими|сасими/i },
  { slug: 'wok', patterns: /\bвок\b|wok|лапша.*вок|вок.*лапш/i },
  { slug: 'ramen', patterns: /рамен|рамён/i },
  { slug: 'poke', patterns: /поке|poke/i },
  { slug: 'dim_sum', patterns: /дим[\s-]?сам|dim[\s-]?sum/i },
  { slug: 'curry', patterns: /карри|curry/i },
  // Grill
  { slug: 'steaks', patterns: /стейк|рибай|стриплойн|филе[\s-]?миньон|тибон|портерхаус|шатобриан|каре|new[\s-]?york/i },
  { slug: 'shashlik', patterns: /шашлык|люля|кебаб.*на.*мангал/i },
  { slug: 'burgers', patterns: /бургер|burger|чизбургер|гамбургер/i },
  { slug: 'ribs', patterns: /рёбр|ребр|ребрыш|ribs/i },
  { slug: 'kebab', patterns: /кебаб|kebab|люля/i },
  // Pizza
  { slug: 'classic_pizza', patterns: /маргарит|пеперон|четыре сыра|гавайск|капричоз/i },
  { slug: 'calzone', patterns: /кальцоне|calzone/i },
  // Pasta
  { slug: 'spaghetti', patterns: /спагетти|spaghetti|карбонар|болоньез|путтанеск|алио.*олио/i },
  { slug: 'lasagna', patterns: /лазань|lasagn/i },
  { slug: 'ravioli', patterns: /равиоли|ravioli/i },
  { slug: 'risotto', patterns: /ризотто|risotto/i },
  { slug: 'penne', patterns: /пенне|penne|арабьят/i },
  { slug: 'tagliatelle', patterns: /тальятел|tagliatelle|феттучин|фетучин|паппарделл/i },
  // Dumplings
  { slug: 'pelmeni', patterns: /пельмен/i },
  { slug: 'khinkali', patterns: /хинкал/i },
  { slug: 'manti', patterns: /манты|мант\b/i },
  { slug: 'gyoza', patterns: /гёдза|гедза|gyoza/i },
  // Breakfast
  { slug: 'eggs', patterns: /яичниц|омлет|скрэмбл|пашот|бенедикт|шакшук/i },
  { slug: 'porridge', patterns: /каша|овсянк|гранол/i },
  { slug: 'syrniki', patterns: /сырник/i },
  { slug: 'toasts', patterns: /тост|toast|брускетт|круассан.*с/i },
  // Desserts
  { slug: 'cheesecakes', patterns: /чизкейк|cheesecake/i },
  { slug: 'tiramisu', patterns: /тирамису|tiramisu/i },
  { slug: 'ice_cream', patterns: /мороженое|пломбир|джелат|сорбет|sorbet/i },
  { slug: 'pancakes', patterns: /блин|панкейк|pancake|оладь|сырник/i },
  { slug: 'cakes', patterns: /торт|наполеон|медовик|прага|захер/i },
  // Bakery
  { slug: 'khachapuri', patterns: /хачапур/i },
  { slug: 'samsa', patterns: /самса|самос/i },
  { slug: 'bread', patterns: /хлеб|лаваш|фокачч|лепёшк|лепешк|пита\b/i },
  { slug: 'pies', patterns: /пирог|пирожок|расстегай|кулебяк|осетинск.*пирог/i },
  { slug: 'chebureki', patterns: /чебурек/i },
  // Drinks
  { slug: 'coffee', patterns: /кофе|капучин|латте|эспрессо|американо|раф|флэт.*уайт|coffee/i },
  { slug: 'tea', patterns: /\bчай\b|tea\b|матча|matcha/i },
  { slug: 'lemonades', patterns: /лимонад|lemonade/i },
  { slug: 'smoothies', patterns: /смузи|smoothie|фреш|fresh/i },
  { slug: 'cocktails', patterns: /коктейл|мохит|маргарит|дайкир|мартин|негрон|спритц|cocktail/i },
  { slug: 'wine', patterns: /\bвин[оа]\b|каберне|мерло|шардоне|пино|совиньон|шираз|рислинг|просекко|шампанск/i },
  { slug: 'beer', patterns: /\bпив[оа]\b|лагер|стаут|портер|эль\b|ipa\b|beer/i },
  { slug: 'spirits', patterns: /виски|водка|коньяк|бренди|ром\b|джин\b|текил|абсент|граппа|саке|whisky|cognac/i },
  // Appetizers
  { slug: 'bruschetta', patterns: /брускетт/i },
  { slug: 'carpaccio', patterns: /карпаччо|carpaccio/i },
  { slug: 'tartare', patterns: /тартар/i },
  { slug: 'cheese_plates', patterns: /сырн.*тарелк|сырн.*плат|ассорти.*сыр|сыр.*ассорти/i },
  { slug: 'meat_plates', patterns: /мясн.*тарелк|мясн.*ассорти|ассорти.*мяс/i },
];

// ─── Protein type patterns ───
const PROTEIN_PATTERNS: Array<{ slug: string; pattern: RegExp }> = [
  { slug: 'beef', pattern: /говядин|рибай|стриплойн|филе[\s-]?миньон|антрекот|оссобук/i },
  { slug: 'pork', pattern: /свинин|свиная|свиной|рулька/i },
  { slug: 'lamb', pattern: /баранин|ягнёнок|ягнятин|каре.*баран/i },
  { slug: 'chicken', pattern: /курин|куриц|цыплён/i },
  { slug: 'duck', pattern: /утк[аиой]|утин/i },
  { slug: 'turkey', pattern: /индейк|индюш/i },
  { slug: 'salmon', pattern: /сёмг|лосос|salmon/i },
  { slug: 'tuna', pattern: /тунец|тунца|tuna/i },
  { slug: 'white_fish', pattern: /судак|дорад|сибас|палтус|треск|щук|окунь|минтай/i },
  { slug: 'red_fish', pattern: /форел|осётр|стерляд|нерк|горбуш|кижуч/i },
  { slug: 'shrimp', pattern: /креветк|shrimp/i },
  { slug: 'squid', pattern: /кальмар/i },
  { slug: 'octopus', pattern: /осьминог/i },
  { slug: 'crab', pattern: /краб/i },
  { slug: 'mussels', pattern: /мидии|гребешок|устриц/i },
  { slug: 'tofu', pattern: /тофу|tofu/i },
];

// ─── Dietary tag patterns ───
const TAG_PATTERNS: Array<{ slug: string; pattern: RegExp }> = [
  { slug: 'vegetarian', pattern: /вегетариан|vegetarian/i },
  { slug: 'vegan', pattern: /веган|vegan/i },
  { slug: 'gluten_free', pattern: /без глютен|gluten[\s-]?free|безглютен/i },
  { slug: 'spicy', pattern: /остр[оыйая]|🌶|spicy|чили|перец.*халапен/i },
  { slug: 'halal', pattern: /халяль|halal/i },
  { slug: 'low_calorie', pattern: /низкокалорийн|диетическ|лёгк.*блюд/i },
];

const BATCH = 5000;

async function run() {
  await ds.initialize();
  console.log('🔌 Connected\n');

  // Load reference data
  const subcategories: Array<{ id: number; slug: string }> = await ds.query('SELECT id, slug FROM dish_subcategories');
  const subMap = new Map(subcategories.map(s => [s.slug, s.id]));

  const categories: Array<{ id: number; slug: string }> = await ds.query('SELECT id, slug FROM dish_categories');
  const catMap = new Map(categories.map(c => [c.slug, c.id]));

  // Build category_id → first subcategory_id (fallback)
  const catFirstSub: Array<{ category_id: number; id: number; slug: string }> = await ds.query(
    'SELECT id, category_id, slug FROM dish_subcategories ORDER BY sort_order LIMIT 1000'
  );
  const catSubMap = new Map<number, number>();
  for (const s of catFirstSub) {
    if (!catSubMap.has(s.category_id)) catSubMap.set(s.category_id, s.id);
  }

  const proteins: Array<{ id: number; slug: string }> = await ds.query('SELECT id, slug FROM protein_types');
  const proteinMap = new Map(proteins.map(p => [p.slug, p.id]));

  const tags: Array<{ id: number; slug: string }> = await ds.query('SELECT id, slug FROM dish_tags');
  const tagMap = new Map(tags.map(t => [t.slug, t.id]));

  console.log(`📊 Refs: ${subMap.size} subcats, ${proteinMap.size} proteins, ${tagMap.size} tags`);

  // Build slug → category name mapping for normalized categoryName
  const slugToName = new Map<string, string>();
  for (const cat of categories) {
    const nameRow = await ds.query('SELECT name FROM dish_categories WHERE slug = $1', [cat.slug]);
    if (nameRow[0]) slugToName.set(cat.slug, nameRow[0].name);
  }

  // Count dishes to process (process ALL, not just unclassified)
  const [{ c: totalStr }] = await ds.query('SELECT COUNT(DISTINCT rd.dish_id) as c FROM restaurant_dishes rd JOIN dishes d ON d.id = rd.dish_id');
  const total = parseInt(totalStr);
  console.log(`📊 Dishes to classify: ${total}\n`);

  let processed = 0;
  let subcatUpdated = 0;
  let catNameFixed = 0;
  let proteinUpdated = 0;
  let tagsInserted = 0;

  for (let offset = 0; offset < total; offset += BATCH) {
    const rows: Array<{ dish_id: number; category_name: string | null; dish_name: string; composition: string | null; description: string | null }> = await ds.query(`
      SELECT DISTINCT ON (rd.dish_id) rd.dish_id, rd.category_name, d.name as dish_name, d.composition, d.description
      FROM restaurant_dishes rd
      JOIN dishes d ON d.id = rd.dish_id
      ORDER BY rd.dish_id
      LIMIT $1 OFFSET $2
    `, [BATCH, offset]);

    if (rows.length === 0) break;

    for (const row of rows) {
      const dishName = (row.dish_name || '').trim();
      const text = [dishName, row.composition, row.description].filter(Boolean).join(' ');

      // Step 1: Determine correct category slug
      // Priority: name-based detection > old categoryName mapping > fallback
      let resolvedCatSlug: string | null = null;

      // a) Name-based detection (catches sauces, bread, soups etc. regardless of old category)
      for (const { slug, pattern } of NAME_CATEGORY_PATTERNS) {
        if (pattern.test(dishName)) {
          resolvedCatSlug = slug;
          break;
        }
      }

      // b) Fallback to old categoryName mapping
      if (!resolvedCatSlug && row.category_name) {
        // If old category_name == dish_name, it's junk — skip
        if (row.category_name.trim() !== dishName) {
          resolvedCatSlug = CATEGORY_MAP[row.category_name] || null;
        }
      }

      // c) If still nothing, try keyword patterns on full text
      if (!resolvedCatSlug) {
        for (const { slug, pattern } of NAME_CATEGORY_PATTERNS) {
          if (pattern.test(text)) {
            resolvedCatSlug = slug;
            break;
          }
        }
      }

      // Step 2: Update categoryName in restaurant_dishes to normalized name
      if (resolvedCatSlug) {
        const normalizedName = slugToName.get(resolvedCatSlug);
        if (normalizedName) {
          const oldCat = (row.category_name || '').trim();
          // Fix if: category is wrong, or category == dish name (junk), or empty
          if (!oldCat || oldCat === dishName || oldCat !== normalizedName) {
            await ds.query(
              'UPDATE restaurant_dishes SET category_name = $1 WHERE dish_id = $2',
              [normalizedName, row.dish_id]
            );
            catNameFixed++;
          }
        }
      }

      // Step 3: Subcategory (fine-grained)
      let subId: number | null = null;
      for (const { slug, patterns } of SUBCATEGORY_PATTERNS) {
        if (patterns.test(text)) {
          subId = subMap.get(slug) || null;
          break;
        }
      }
      if (!subId && resolvedCatSlug) {
        const catId = catMap.get(resolvedCatSlug);
        if (catId) subId = catSubMap.get(catId) || null;
      }
      if (subId) {
        await ds.query('UPDATE dishes SET subcategory_id = $1 WHERE id = $2 AND subcategory_id IS NULL', [subId, row.dish_id]);
        subcatUpdated++;
      }

      // Step 4: Protein type
      for (const { slug, pattern } of PROTEIN_PATTERNS) {
        if (pattern.test(text)) {
          const pid = proteinMap.get(slug);
          if (pid) {
            await ds.query('UPDATE dishes SET protein_type_id = $1 WHERE id = $2 AND protein_type_id IS NULL', [pid, row.dish_id]);
            proteinUpdated++;
          }
          break;
        }
      }

      // Step 5: Dietary tags
      for (const { slug, pattern } of TAG_PATTERNS) {
        if (pattern.test(text)) {
          const tid = tagMap.get(slug);
          if (tid) {
            await ds.query('INSERT INTO dish_dish_tags (dish_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [row.dish_id, tid]);
            tagsInserted++;
          }
        }
      }
    }

    processed += rows.length;
    if (processed % 5000 === 0 || rows.length < BATCH) {
      console.log(`  ${processed}/${total} | catFix: ${catNameFixed} | subcat: ${subcatUpdated} | protein: ${proteinUpdated} | tags: ${tagsInserted}`);
    }
  }

  console.log(`\n✅ Done!`);
  console.log(`   CategoryName fixed: ${catNameFixed}`);
  console.log(`   Subcategory assigned: ${subcatUpdated}`);
  console.log(`   Protein type assigned: ${proteinUpdated}`);
  console.log(`   Tags inserted: ${tagsInserted}`);

  // Stats
  const withSub = await ds.query('SELECT COUNT(*) as c FROM dishes WHERE subcategory_id IS NOT NULL');
  const withProt = await ds.query('SELECT COUNT(*) as c FROM dishes WHERE protein_type_id IS NOT NULL');
  const tagLinks = await ds.query('SELECT COUNT(*) as c FROM dish_dish_tags');
  console.log(`\n📊 Total enriched:`);
  console.log(`   With subcategory: ${withSub[0].c}`);
  console.log(`   With protein: ${withProt[0].c}`);
  console.log(`   Tag links: ${tagLinks[0].c}`);

  await ds.destroy();
}

run().catch(err => { console.error('❌', err); process.exit(1); });
