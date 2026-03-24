/**
 * Deep keyword-based dish enrichment (no LLM).
 * Assigns: cooking methods, taste profiles, vegetarian/vegan, spicy_level, tags.
 *
 * Run: cd backend && npx ts-node scripts/enrich-dishes.ts
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

// ─── Cooking method patterns ───
const COOKING_PATTERNS: Array<{ slug: string; pattern: RegExp }> = [
  { slug: 'grilled', pattern: /на гриле|гриль|грилован|grilled/i },
  { slug: 'fried', pattern: /жарен|обжарен|поджарен|сковород|fried/i },
  { slug: 'baked', pattern: /запечён|запечен|в духовке|духов|baked|печён|печен|gratine/i },
  { slug: 'boiled', pattern: /варён|варен|отварн|boiled/i },
  { slug: 'steamed', pattern: /на пару|паров|steamed/i },
  { slug: 'stewed', pattern: /тушён|тушен|рагу|stewed/i },
  { slug: 'raw', pattern: /\bсырой\b|сырая|тартар|севиче|карпаччо|сашими|raw\b/i },
  { slug: 'smoked', pattern: /копчён|копчен|копч|smoked/i },
  { slug: 'deep_fried', pattern: /фритюр|во фритюре|deep.?fried|темпур|хрустящ/i },
  { slug: 'sous_vide', pattern: /су[\s-]?вид|sous[\s-]?vide/i },
  { slug: 'charcoal', pattern: /на углях|уголь|мангал|charcoal|тандыр|тандур/i },
  { slug: 'braised', pattern: /томлён|томлен|braised|долго.*готов/i },
  { slug: 'wok', pattern: /\bвок\b|\bwok\b/i },
  { slug: 'marinated', pattern: /маринован|marinated/i },
];

// ─── Vegetarian/vegan detection ───
const MEAT_FISH_PATTERN = /говядин|свинин|баранин|курин|куриц|цыплён|утк[аиой]|индейк|рыб[аыу]|сёмг|лосос|форел|тунец|судак|сибас|дорад|палтус|треск|кальмар|креветк|осьминог|мидии|краб|гребешок|устриц|бекон|ветчин|колбас|сосиск|сало|рёбр|шашлык|кебаб|стейк|рибай|люля|хамон|прошутто|пельмен|хинкал|анчоус|икр[аыу]/i;
const VEGAN_EXCLUDE = /молок|сыр[а-я]?\b|сливк|сметан|йогурт|творог|масло.*сливоч|яиц|яйц|мёд\b|мед\b|сливочн/i;
const VEGETARIAN_CATEGORIES = new Set(['Салаты', 'Десерты', 'Гарниры', 'Хлеб и выпечка', 'Соусы']);

// ─── Spicy detection ───
const SPICY_HIGH = /очень.*остр|super.*spicy|адск|огненн|🌶🌶|хабанеро|carolina|тринидад/i;
const SPICY_MED = /остр[оыйая]|spicy|чили|халапеньо|васаби|wasabi|табаско|шрирач|карри.*остр|аджик/i;
const SPICY_LOW = /с перц|перч|чёрн.*перец|чесноч|имбир|горчиц|хрен\b|аджик/i;

// ─── Taste profile estimation (by dish type) ───
// Format: [sweet, sour, salty, bitter, umami, spicy]
const TASTE_RULES: Array<{ pattern: RegExp; taste: number[] }> = [
  // Sweet dishes
  { pattern: /десерт|торт|пирожн|мороженое|чизкейк|тирамису|панна.*котта|шоколад|карамел|мусс|крем.*брюле|маффин|капкейк|конфет|варенье|джем|мёд|пахлава|чак-чак/i, taste: [8, 1, 1, 0, 0, 0] },
  // Sour-sweet (Asian)
  { pattern: /кисло.*сладк|sweet.*sour|терияки|teriyaki|в соусе.*манго|апельсинов.*соус/i, taste: [6, 5, 3, 0, 2, 1] },
  // Umami-heavy
  { pattern: /мисо|соевый|грибн|трюфел|пармезан|том ям|даши|рамен|фо бо|бульон/i, taste: [1, 1, 4, 0, 8, 1] },
  // Salty/savory
  { pattern: /солён|малосольн|маринован|квашен|оливк|каперс|анчоус|бекон|прошутто|хамон/i, taste: [0, 2, 7, 0, 4, 0] },
  // Sour
  { pattern: /лимон|цитрус|уксус|кислый|vinaigrette|севиче|понзу/i, taste: [1, 7, 2, 0, 1, 0] },
  // Spicy
  { pattern: /острый|чили|халапеньо|карри|масал|тхали|том.*ям.*кунг|кимчи|аджик|табаско|шрирач/i, taste: [1, 1, 3, 0, 3, 7] },
  // Creamy
  { pattern: /сливочн|крем[\s-]?суп|карбонар|альфред|бешамель|крем.*брюле|со сливк/i, taste: [3, 0, 3, 0, 3, 0] },
  // Smoky/grill
  { pattern: /копчён|на углях|барбекю|bbq|гриль|мангал|на огне|дымн/i, taste: [1, 0, 4, 1, 5, 1] },
  // Bitter (coffee, chocolate)
  { pattern: /кофе|эспрессо|американо|тёмн.*шоколад|горьк.*шоколад|какао|bitter/i, taste: [3, 0, 0, 6, 1, 0] },
  // Fresh/light
  { pattern: /салат|свеж|зелён|руккол|шпинат|авокадо|огурец|микс.*листь/i, taste: [1, 2, 2, 1, 1, 0] },
  // Default soup
  { pattern: /суп\b|борщ|солянк|щи\b|харчо|лагман|шурп/i, taste: [1, 2, 4, 0, 5, 1] },
  // Default meat
  { pattern: /стейк|рибай|каре|филе|медальон|отбивн/i, taste: [0, 0, 3, 0, 7, 0] },
  // Bread/bakery
  { pattern: /хлеб|лаваш|хачапур|фокачч|круассан|самса|чебурек|пирог|пирожок/i, taste: [2, 0, 3, 0, 2, 0] },
  // Drinks non-alcoholic
  { pattern: /чай\b|кофе|латте|капучин|смузи|сок\b|фреш|лимонад/i, taste: [4, 2, 0, 2, 0, 0] },
  // Alcohol
  { pattern: /вино|пиво|виски|водка|коньяк|коктейл|мохит|джин/i, taste: [2, 1, 0, 3, 0, 0] },
];

const BATCH = 2000;

async function run() {
  await ds.initialize();
  console.log('🔌 Connected\n');

  // Load reference data
  const cookingMethods: Array<{ id: number; slug: string }> = await ds.query('SELECT id, slug FROM cooking_methods');
  const cmMap = new Map(cookingMethods.map(c => [c.slug, c.id]));

  const tags: Array<{ id: number; slug: string }> = await ds.query('SELECT id, slug FROM dish_tags');
  const tagMap = new Map(tags.map(t => [t.slug, t.id]));

  console.log(`📊 Refs: ${cmMap.size} cooking methods, ${tagMap.size} tags`);

  // Get all linked dishes
  const [{ c: totalStr }] = await ds.query(`
    SELECT COUNT(DISTINCT d.id) as c FROM dishes d
    JOIN restaurant_dishes rd ON rd.dish_id = d.id
  `);
  const total = parseInt(totalStr);
  console.log(`📊 Dishes to enrich: ${total}\n`);

  let processed = 0;
  const stats = { cooking: 0, vegetarian: 0, vegan: 0, spicy: 0, taste: 0, tags: 0 };

  for (let offset = 0; offset < total; offset += BATCH) {
    const rows: Array<{ id: number; name: string; composition: string | null; description: string | null; category_name: string | null }> = await ds.query(`
      SELECT DISTINCT d.id, d.name, d.composition, d.description, rd.category_name
      FROM dishes d
      JOIN restaurant_dishes rd ON rd.dish_id = d.id
      ORDER BY d.id
      LIMIT $1 OFFSET $2
    `, [BATCH, offset]);

    if (rows.length === 0) break;

    for (const row of rows) {
      const text = [row.name, row.composition, row.description].filter(Boolean).join(' ');
      const textLow = text.toLowerCase();

      // 1. Cooking methods
      for (const { slug, pattern } of COOKING_PATTERNS) {
        if (pattern.test(text)) {
          const cmId = cmMap.get(slug);
          if (cmId) {
            await ds.query('INSERT INTO dish_cooking_methods (dish_id, cooking_method_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [row.id, cmId]);
            stats.cooking++;
          }
        }
      }

      // 2. Vegetarian / Vegan
      const hasMeat = MEAT_FISH_PATTERN.test(text);
      const hasDairy = VEGAN_EXCLUDE.test(text);
      const isVegCategory = VEGETARIAN_CATEGORIES.has(row.category_name || '');

      if (!hasMeat && (isVegCategory || /овощ|грибн|тофу|фалаф|хумус|салат/i.test(textLow))) {
        if (!hasDairy && /веган|vegan|тофу|фалаф|хумус/i.test(textLow)) {
          await ds.query('UPDATE dishes SET is_vegan = true, is_vegetarian = true WHERE id = $1', [row.id]);
          stats.vegan++;
        } else {
          await ds.query('UPDATE dishes SET is_vegetarian = true WHERE id = $1', [row.id]);
          stats.vegetarian++;
        }
      }

      // 3. Spicy level
      let spicyLevel = 0;
      if (SPICY_HIGH.test(text)) spicyLevel = 3;
      else if (SPICY_MED.test(text)) spicyLevel = 2;
      else if (SPICY_LOW.test(text)) spicyLevel = 1;

      if (spicyLevel > 0) {
        await ds.query('UPDATE dishes SET spicy_level = $1 WHERE id = $2', [spicyLevel, row.id]);
        stats.spicy++;
        const tid = tagMap.get('spicy');
        if (tid && spicyLevel >= 2) {
          await ds.query('INSERT INTO dish_dish_tags (dish_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [row.id, tid]);
          stats.tags++;
        }
      }

      // 4. Taste profile
      for (const { pattern, taste } of TASTE_RULES) {
        if (pattern.test(text)) {
          await ds.query(
            'UPDATE dishes SET taste_sweet=$1, taste_sour=$2, taste_salty=$3, taste_bitter=$4, taste_umami=$5, taste_spicy=$6 WHERE id=$7 AND taste_sweet=0 AND taste_sour=0 AND taste_salty=0',
            [...taste, row.id]
          );
          stats.taste++;
          break;
        }
      }

      // 5. Extra tags from keywords
      const tagChecks: Array<[string, RegExp]> = [
        ['vegetarian', /вегетариан/i],
        ['vegan', /веган|vegan/i],
        ['gluten_free', /без глютен|безглютен|gluten.?free/i],
        ['lactose_free', /без лактоз|безлактоз|lactose.?free/i],
        ['halal', /халяль|halal/i],
        ['kosher', /кошерн|kosher/i],
        ['keto', /\bкето\b|keto\b/i],
        ['low_calorie', /низкокалорийн|диетическ|пп\b|правильн.*питан/i],
        ['kids_friendly', /детск/i],
        ['signature', /авторск|фирменн|от шеф/i],
        ['street_food', /стрит|street/i],
        ['comfort_food', /домашн|бабушк|как дома/i],
        ['hot', /горяч|hot\b/i],
        ['cold', /холодн|cold\b|ледян/i],
      ];

      for (const [slug, pattern] of tagChecks) {
        if (pattern.test(text)) {
          const tid = tagMap.get(slug);
          if (tid) {
            await ds.query('INSERT INTO dish_dish_tags (dish_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [row.id, tid]);
            stats.tags++;
          }
        }
      }
    }

    processed += rows.length;
    if (processed % 10000 === 0 || rows.length < BATCH) {
      console.log(`  ${processed}/${total} | cook:${stats.cooking} veg:${stats.vegetarian} vgn:${stats.vegan} spicy:${stats.spicy} taste:${stats.taste} tags:${stats.tags}`);
    }
  }

  console.log(`\n✅ Enrichment done!`);
  console.log(`   Cooking method links: ${stats.cooking}`);
  console.log(`   Vegetarian: ${stats.vegetarian}`);
  console.log(`   Vegan: ${stats.vegan}`);
  console.log(`   Spicy detected: ${stats.spicy}`);
  console.log(`   Taste profiles: ${stats.taste}`);
  console.log(`   Tag links: ${stats.tags}`);

  // Final stats
  const r = await ds.query(`
    SELECT
      (SELECT COUNT(*) FROM dishes WHERE is_vegetarian) as vegetarian,
      (SELECT COUNT(*) FROM dishes WHERE is_vegan) as vegan,
      (SELECT COUNT(*) FROM dishes WHERE spicy_level > 0) as spicy,
      (SELECT COUNT(*) FROM dishes WHERE taste_sweet > 0 OR taste_sour > 0 OR taste_salty > 0 OR taste_umami > 0) as has_taste,
      (SELECT COUNT(*) FROM dish_cooking_methods) as cooking_links,
      (SELECT COUNT(*) FROM dish_dish_tags) as tag_links
  `);
  console.log('\n📊 Database totals:', r[0]);

  await ds.destroy();
}

run().catch(err => { console.error('❌', err); process.exit(1); });
