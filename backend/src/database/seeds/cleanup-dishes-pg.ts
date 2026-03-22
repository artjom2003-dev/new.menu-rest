/**
 * Comprehensive dish cleanup directly in PostgreSQL.
 * Fixes: prices in names, merged dishes, junk, short menus, categories.
 *
 * Usage: cd backend && npx ts-node src/database/seeds/cleanup-dishes-pg.ts
 */
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const pg = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'menurest',
  username: process.env.DB_USER || 'menurest',
  password: process.env.DB_PASSWORD,
  synchronize: false,
  entities: [],
});

// Category guessing from dish name
const CATEGORY_RULES: [RegExp, string][] = [
  [/салат|цезарь|оливье|греческ|винегрет/i, 'Салаты'],
  [/\bсуп\b|борщ|солянк|щи\b|бульон|харчо|окрошк|гаспач|том.?ям|уха\b|минестрон|рассольник/i, 'Супы'],
  [/пицц[аы]/i, 'Пицца'],
  [/паст[аы]\b|спагетти|карбонар|болоньез|лазань|равиоли|ризотто|фетучин|тальятелле|пенне/i, 'Паста'],
  [/ролл\b|ролл[ыа]|суши|маки\b|сашими|филадельф|калифорни/i, 'Суши и роллы'],
  [/стейк|рибай|филе.?миньон|т.?бон|шашлык|каре\b|гриль|мангал/i, 'Стейки и гриль'],
  [/бургер|чизбургер|гамбургер/i, 'Бургеры'],
  [/десерт|торт\b|чизкейк|тирамису|панна.?кот|мороженое|брауни|штрудел|пирожн|круассан|эклер|маффин|медовик|наполеон/i, 'Десерты'],
  [/кофе|чай\b|латте|капучино|эспрессо|американо|какао|матча/i, 'Напитки безалкогольные'],
  [/лимонад|морс|компот|смузи|фреш|сок\b|молочн.*коктейл|милкшейк/i, 'Напитки безалкогольные'],
  [/виски|водк|коньяк|бренди|ром\b|джин\b|текил|настойк|ликёр|ликер|абсент|граппа|бурбон|кальвадос|мескаль/i, 'Алкоголь'],
  [/вин[оа]\b|шампанск|просекко|каберне|мерло|пино\b|совиньон|шардоне|рислинг/i, 'Вино'],
  [/пив[оа]\b|beer|эль\b|лагер|стаут/i, 'Пиво'],
  [/гарнир|картофел|рис\b|пюре\b|овощи на/i, 'Гарниры'],
  [/соус\b/i, 'Соусы'],
  [/хлеб|лепёшк|лепешк|фокачч|чиабатт|булочк/i, 'Хлеб и выпечка'],
  [/креветк|мидии|устриц|кальмар|осьминог|лобстер|краб/i, 'Морепродукты'],
  [/закуск|брускет|тартар|карпачч|антипаст/i, 'Закуски'],
  [/детск/i, 'Детское меню'],
  [/завтрак|бранч|яичниц|омлет|каша\b|сырник|блинчик|оладь/i, 'Завтраки'],
];

function guessCategory(name: string): string | null {
  for (const [re, cat] of CATEGORY_RULES) {
    if (re.test(name)) return cat;
  }
  return null;
}

function cleanDishName(name: string): { cleaned: string; isJunk: boolean } {
  let s = name;

  // Remove trailing ' /' or '/ '
  s = s.replace(/\s*\/\s*$/, '').trim();

  // Remove trailing 3-5 digit numbers (prices): "Борщ 450" → "Борщ"
  s = s.replace(/\s+\d{3,5}\s*[-.]?\s*$/, '').trim();

  // Remove trailing "NNNр" or "NNN р"
  s = s.replace(/\s+\d{2,5}\s*р\s*$/, '').trim();

  // Remove volume at end: "500 мл", "250ml", "0,25", "0.5л"
  s = s.replace(/\s+\d[,.]?\d*\s*(мл|ml|л|l)\s*$/i, '').trim();
  s = s.replace(/\s+0[,.]\d+\s*$/i, '').trim();

  // Remove "| Brand" at end (already partially done)
  s = s.replace(/\s*\|\s*[A-Za-zА-Яа-я].*$/, '').trim();

  // Remove "(NNN мл)" or "(NNN г)" in parens
  s = s.replace(/\s*\(\d{1,5}\s*(мл|г|гр|ml)\)\s*/gi, ' ').trim();

  // Remove weight like "1/160" at end
  s = s.replace(/\s+\d\/\d{2,4}\s*$/, '').trim();

  // Remove trailing ".-"
  s = s.replace(/\s*\.-\s*$/, '').trim();

  // Remove "р." embedded prices
  s = s.replace(/\s+\d{2,5}\s*р\.\s*/g, ' ').trim();

  // Clean double spaces
  s = s.replace(/\s{2,}/g, ' ').trim();

  // Junk detection
  const isJunk =
    s.length < 3 ||
    /^[0-9.,\s]+$/.test(s) ||                           // pure numbers
    /^(cid:\d+|#\d+)/.test(s) ||                        // PDF artifacts
    /скидка|акция|промокод|при заказе от/i.test(s) ||    // promos
    /стоимость (меню|банкет)/i.test(s) ||                // pricing info
    /фуршет|банкет/i.test(s) ||                          // event pricing
    /за три дня/i.test(s) ||                             // advance order
    /доставк[аи]/i.test(s) ||                            // delivery info
    false;

  return { cleaned: s, isJunk };
}

function isMergedDish(name: string): boolean {
  // Two dishes glued: "Эспрессо 210 Клубничный Мохито", "Борщ 450 Солянка 380"
  // Pattern: word(s) + 3-digit number + uppercase word
  return /[а-яa-z]\s+\d{3,5}\s+[А-ЯA-Z]/.test(name) && name.length > 30;
}

async function run() {
  await pg.initialize();
  console.log('='.repeat(60));
  console.log('  COMPREHENSIVE DISH CLEANUP');
  console.log('='.repeat(60));

  // Load all dishes
  const allDishes: { id: number; name: string }[] = await pg.query(
    'SELECT d.id, d.name FROM dishes d WHERE d.id IN (SELECT dish_id FROM restaurant_dishes)'
  );
  console.log(`\nTotal dishes: ${allDishes.length.toLocaleString()}`);

  let namesFixed = 0;
  let junkDeleted = 0;
  let mergedDeleted = 0;

  // Step 1: Clean names, mark junk, detect merged
  console.log('\n[Step 1] Cleaning dish names...');
  const junkDishIds: number[] = [];
  const mergedDishIds: number[] = [];

  for (const dish of allDishes) {
    const { cleaned, isJunk } = cleanDishName(dish.name);

    if (isJunk) {
      junkDishIds.push(dish.id);
      continue;
    }

    if (isMergedDish(dish.name)) {
      mergedDishIds.push(dish.id);
      continue;
    }

    if (cleaned !== dish.name) {
      await pg.query('UPDATE dishes SET name = $1 WHERE id = $2', [cleaned, dish.id]);
      namesFixed++;
    }
  }

  console.log(`  Names fixed: ${namesFixed.toLocaleString()}`);
  console.log(`  Junk dishes: ${junkDishIds.length}`);
  console.log(`  Merged dishes: ${mergedDishIds.length}`);

  // Step 2: Delete junk and merged dishes
  console.log('\n[Step 2] Deleting junk and merged dishes...');
  const toDelete = [...junkDishIds, ...mergedDishIds];
  const BATCH = 500;
  for (let i = 0; i < toDelete.length; i += BATCH) {
    const batch = toDelete.slice(i, i + BATCH);
    const ph = batch.map((_, j) => `$${j + 1}`).join(',');
    await pg.query(`DELETE FROM restaurant_dishes WHERE dish_id IN (${ph})`, batch);
  }
  junkDeleted = junkDishIds.length;
  mergedDeleted = mergedDishIds.length;
  console.log(`  Deleted: ${toDelete.length}`);

  // Step 3: Remove restaurants with <=2 dishes (not a real menu)
  console.log('\n[Step 3] Removing restaurants with <=2 dishes...');
  const tooFew = await pg.query(`
    DELETE FROM restaurant_dishes WHERE restaurant_id IN (
      SELECT restaurant_id FROM restaurant_dishes GROUP BY restaurant_id HAVING COUNT(*) <= 2
    ) RETURNING id
  `);
  console.log(`  Removed: ${tooFew.length} dish links from tiny menus`);

  // Step 4: Fix "Другое" categories
  console.log('\n[Step 4] Improving categories...');
  const drugoe = await pg.query(`
    SELECT rd.id, d.name FROM restaurant_dishes rd
    JOIN dishes d ON d.id = rd.dish_id
    WHERE rd.category_name = 'Другое'
  `);
  console.log(`  "Другое" dishes: ${drugoe.length.toLocaleString()}`);

  let catFixed = 0;
  for (const row of drugoe) {
    const cat = guessCategory(row.name);
    if (cat) {
      await pg.query('UPDATE restaurant_dishes SET category_name = $1 WHERE id = $2', [cat, row.id]);
      catFixed++;
    }
  }
  console.log(`  Re-categorized: ${catFixed.toLocaleString()}`);

  // Step 5: Remove duplicate dishes within same restaurant
  console.log('\n[Step 5] Removing duplicates...');
  const dups = await pg.query(`
    DELETE FROM restaurant_dishes WHERE id IN (
      SELECT id FROM (
        SELECT rd.id, ROW_NUMBER() OVER (
          PARTITION BY rd.restaurant_id, d.name
          ORDER BY rd.price DESC, rd.id
        ) as rn
        FROM restaurant_dishes rd
        JOIN dishes d ON d.id = rd.dish_id
      ) t WHERE rn > 1
    ) RETURNING id
  `);
  console.log(`  Duplicates removed: ${dups.length}`);

  // Step 6: Clean empty menu_categories
  console.log('\n[Step 6] Cleaning empty categories...');
  const emptyCats = await pg.query(`
    DELETE FROM menu_categories WHERE id NOT IN (
      SELECT DISTINCT menu_category_id FROM restaurant_dishes WHERE menu_category_id IS NOT NULL
    ) RETURNING id
  `);
  console.log(`  Empty categories removed: ${emptyCats.length}`);

  // Final stats
  const finalDishes = await pg.query('SELECT COUNT(*) as cnt FROM restaurant_dishes');
  const finalRests = await pg.query('SELECT COUNT(DISTINCT restaurant_id) as cnt FROM restaurant_dishes');
  const finalDrugoe = await pg.query("SELECT COUNT(*) as cnt FROM restaurant_dishes WHERE category_name = 'Другое'");
  const finalCats = await pg.query('SELECT category_name, COUNT(*) as cnt FROM restaurant_dishes GROUP BY category_name ORDER BY cnt DESC LIMIT 15');

  console.log('\n' + '='.repeat(60));
  console.log('  CLEANUP COMPLETE');
  console.log('='.repeat(60));
  console.log(`  Names fixed:        ${namesFixed.toLocaleString()}`);
  console.log(`  Junk deleted:       ${junkDeleted}`);
  console.log(`  Merged deleted:     ${mergedDeleted}`);
  console.log(`  Tiny menus removed: ${tooFew.length} links`);
  console.log(`  Duplicates removed: ${dups.length}`);
  console.log(`  Categories fixed:   ${catFixed.toLocaleString()}`);
  console.log(`  Total dishes:       ${finalDishes[0].cnt.toLocaleString()}`);
  console.log(`  Total restaurants:  ${finalRests[0].cnt.toLocaleString()}`);
  console.log(`  Still "Другое":     ${finalDrugoe[0].cnt.toLocaleString()}`);
  console.log(`\nCategories:`);
  for (const r of finalCats) {
    console.log(`    ${(r.category_name || 'NULL').padEnd(30)} ${parseInt(r.cnt).toLocaleString()}`);
  }

  // Sample verification
  console.log('\n  Sample dishes after cleanup:');
  const sample = await pg.query(`
    SELECT d.name, rd.price/100 as rub, rd.category_name
    FROM restaurant_dishes rd JOIN dishes d ON d.id = rd.dish_id
    ORDER BY RANDOM() LIMIT 15
  `);
  for (const r of sample) {
    console.log(`    ${r.name.padEnd(45)} | ${(r.category_name || '').padEnd(20)} | ${r.rub}`);
  }

  await pg.destroy();
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
