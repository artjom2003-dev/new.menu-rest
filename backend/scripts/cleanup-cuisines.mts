/**
 * Cuisine Cleanup Script
 *
 * 1. Classify 191 cuisines into: national, venue, specialization, dietary, remove
 * 2. Add venue_type column + populate from cuisines and descriptions
 * 3. Move specializations to features table
 * 4. Move dietary labels to features
 * 5. Extract national cuisines from descriptions for restaurants with none
 * 6. Clean descriptions (remove hours, Afisha/Restoclub mentions)
 * 7. Delete non-national cuisines from cuisines table
 */

import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'menurest',
  password: 'menurest_dev_pass',
  database: 'menurest',
});

// ─── Classification Map ─────────────────────────────────────

type Action = 'keep' | 'venue' | 'spec' | 'dietary' | 'remove';

interface Classification {
  slug: string;
  action: Action;
  target?: string; // venue type slug or spec/dietary feature slug
  icon?: string;
}

const CLASSIFICATIONS: Record<string, Classification> = {
  // ═══ NATIONAL CUISINES (keep) ═══
  'abkhazskaya': { slug: 'abkhazskaya', action: 'keep' },
  'avstraliyskaya-kukhnya': { slug: 'avstraliyskaya-kukhnya', action: 'keep' },
  'avstriyskaya': { slug: 'avstriyskaya', action: 'keep' },
  'adygeyskaya-kukhnya': { slug: 'adygeyskaya-kukhnya', action: 'keep' },
  'azerbaydzhanskaya': { slug: 'azerbaydzhanskaya', action: 'keep' },
  'aziatskaya': { slug: 'aziatskaya', action: 'keep' },
  'american': { slug: 'american', action: 'keep' },
  'angliyskaya': { slug: 'angliyskaya', action: 'keep' },
  'arabskaya': { slug: 'arabskaya', action: 'keep' },
  'argentinskaya': { slug: 'argentinskaya', action: 'keep' },
  'armyanskaya': { slug: 'armyanskaya', action: 'keep' },
  'afrikanskaya': { slug: 'afrikanskaya', action: 'keep' },
  'bavarskaya': { slug: 'bavarskaya', action: 'keep' },
  'balkanskaya': { slug: 'balkanskaya', action: 'keep' },
  'balkarskaya-kukhnya': { slug: 'balkarskaya-kukhnya', action: 'keep' },
  'bashkirskaya': { slug: 'bashkirskaya', action: 'keep' },
  'belorusskaya': { slug: 'belorusskaya', action: 'keep' },
  'belgiyskaya': { slug: 'belgiyskaya', action: 'keep' },
  'blizhnevostochnaya-kukhnya': { slug: 'blizhnevostochnaya-kukhnya', action: 'keep' },
  'bolgarskaya': { slug: 'bolgarskaya', action: 'keep' },
  'brazilskaya': { slug: 'brazilskaya', action: 'keep' },
  'britanskaya': { slug: 'britanskaya', action: 'keep' },
  'buryatskaya': { slug: 'buryatskaya', action: 'keep' },
  'vengerskaya': { slug: 'vengerskaya', action: 'keep' },
  'vetnamskaya': { slug: 'vetnamskaya', action: 'keep' },
  'vostochnaya': { slug: 'vostochnaya', action: 'keep' },
  'vostochnoevropeyskaya': { slug: 'vostochnoevropeyskaya', action: 'keep' },
  'gavayskaya-kukhnya': { slug: 'gavayskaya-kukhnya', action: 'keep' },
  'grecheskaya': { slug: 'grecheskaya', action: 'keep' },
  'georgian': { slug: 'georgian', action: 'keep' },
  'dagestanskaya-kukhnya': { slug: 'dagestanskaya-kukhnya', action: 'keep' },
  'datskaya': { slug: 'datskaya', action: 'keep' },
  'evreyskaya': { slug: 'evreyskaya', action: 'keep' },
  'european': { slug: 'european', action: 'keep' },
  'izrailskaya': { slug: 'izrailskaya', action: 'keep' },
  'indian': { slug: 'indian', action: 'keep' },
  'indoneziyskaya': { slug: 'indoneziyskaya', action: 'keep' },
  'iranskaya': { slug: 'iranskaya', action: 'keep' },
  'irlandskaya': { slug: 'irlandskaya', action: 'keep' },
  'ispanskaya': { slug: 'ispanskaya', action: 'keep' },
  'italian': { slug: 'italian', action: 'keep' },
  'caucasian': { slug: 'caucasian', action: 'keep' },
  'kadzhunskaya': { slug: 'kadzhunskaya', action: 'keep' },
  'kazakhskaya': { slug: 'kazakhskaya', action: 'keep' },
  'kalmytskaya-kukhnya': { slug: 'kalmytskaya-kukhnya', action: 'keep' },
  'karelskaya': { slug: 'karelskaya', action: 'keep' },
  'karibskaya': { slug: 'karibskaya', action: 'keep' },
  'kirgizskaya-kukhnya': { slug: 'kirgizskaya-kukhnya', action: 'keep' },
  'chinese': { slug: 'chinese', action: 'keep' },
  'kontinentalnaya': { slug: 'kontinentalnaya', action: 'keep' },
  'koreyskaya': { slug: 'koreyskaya', action: 'keep' },
  'kreolskaya': { slug: 'kreolskaya', action: 'keep' },
  'kubinskaya': { slug: 'kubinskaya', action: 'keep' },
  'latinoamerikanskaya': { slug: 'latinoamerikanskaya', action: 'keep' },
  'livanskaya': { slug: 'livanskaya', action: 'keep' },
  'litovskaya': { slug: 'litovskaya', action: 'keep' },
  'marokkanskaya': { slug: 'marokkanskaya', action: 'keep' },
  'mezhdunarodnaya': { slug: 'mezhdunarodnaya', action: 'keep' },
  'mexican': { slug: 'mexican', action: 'keep' },
  'moldavskaya': { slug: 'moldavskaya', action: 'keep' },
  'mongolskaya': { slug: 'mongolskaya', action: 'keep' },
  'nemetskaya': { slug: 'nemetskaya', action: 'keep' },
  'norvezhskaya': { slug: 'norvezhskaya', action: 'keep' },
  'osetinskaya': { slug: 'osetinskaya', action: 'keep' },
  'pakistanskaya-kukhnya': { slug: 'pakistanskaya-kukhnya', action: 'keep' },
  'pan-asian': { slug: 'pan-asian', action: 'keep' },
  'peruanskaya': { slug: 'peruanskaya', action: 'keep' },
  'persidskaya-kukhnya': { slug: 'persidskaya-kukhnya', action: 'keep' },
  'peterburgskaya-kukhnya': { slug: 'peterburgskaya-kukhnya', action: 'keep' },
  'polineziyskaya': { slug: 'polineziyskaya', action: 'keep' },
  'portugalskaya': { slug: 'portugalskaya', action: 'keep' },
  'pribaltiyskaya': { slug: 'pribaltiyskaya', action: 'keep' },
  'rumynskaya-kukhnya': { slug: 'rumynskaya-kukhnya', action: 'keep' },
  'russian': { slug: 'russian', action: 'keep' },
  'severnaya': { slug: 'severnaya', action: 'keep' },
  'serbskaya': { slug: 'serbskaya', action: 'keep' },
  'sibirskaya': { slug: 'sibirskaya', action: 'keep' },
  'singapurskaya-kukhnya': { slug: 'singapurskaya-kukhnya', action: 'keep' },
  'siriyskaya-kukhnya': { slug: 'siriyskaya-kukhnya', action: 'keep' },
  'skandinavskaya': { slug: 'skandinavskaya', action: 'keep' },
  'sovetskaya': { slug: 'sovetskaya', action: 'keep' },
  'mediterranean': { slug: 'mediterranean', action: 'keep' },
  'sredneevropeyskaya': { slug: 'sredneevropeyskaya', action: 'keep' },
  'tadzhikskaya-kukhnya': { slug: 'tadzhikskaya-kukhnya', action: 'keep' },
  'tayskaya': { slug: 'tayskaya', action: 'keep' },
  'tatarskaya': { slug: 'tatarskaya', action: 'keep' },
  'tibetskaya': { slug: 'tibetskaya', action: 'keep' },
  'turkish': { slug: 'turkish', action: 'keep' },
  'turkmenskaya-kukhnya': { slug: 'turkmenskaya-kukhnya', action: 'keep' },
  'uzbek': { slug: 'uzbek', action: 'keep' },
  'uygurskaya': { slug: 'uygurskaya', action: 'keep' },
  'ukrainskaya': { slug: 'ukrainskaya', action: 'keep' },
  'uralskaya': { slug: 'uralskaya', action: 'keep' },
  'filippinskaya': { slug: 'filippinskaya', action: 'keep' },
  'finskaya': { slug: 'finskaya', action: 'keep' },
  'french': { slug: 'french', action: 'keep' },
  'cheshskaya': { slug: 'cheshskaya', action: 'keep' },
  'chechenskaya': { slug: 'chechenskaya', action: 'keep' },
  'shotlandskaya': { slug: 'shotlandskaya', action: 'keep' },
  'shvedskaya-kukhnya': { slug: 'shvedskaya-kukhnya', action: 'keep' },
  'shveytsarskaya-kukhnya': { slug: 'shveytsarskaya-kukhnya', action: 'keep' },
  'ekzoticheskaya': { slug: 'ekzoticheskaya', action: 'keep' },
  'estonskaya-kukhnya': { slug: 'estonskaya-kukhnya', action: 'keep' },
  'efiopskaya-kukhnya': { slug: 'efiopskaya-kukhnya', action: 'keep' },
  'yugoslavskaya': { slug: 'yugoslavskaya', action: 'keep' },
  'yuzhnoamerikanskaya': { slug: 'yuzhnoamerikanskaya', action: 'keep' },
  'yakutskaya': { slug: 'yakutskaya', action: 'keep' },
  'yamayskaya': { slug: 'yamayskaya', action: 'keep' },
  'japanese': { slug: 'japanese', action: 'keep' },
  'natsionalnaya': { slug: 'natsionalnaya', action: 'remove' },
  'koshernaya': { slug: 'koshernaya', action: 'keep' },

  // ═══ VENUE TYPES ═══
  'kafe': { slug: 'kafe', action: 'venue', target: 'cafe' },
  'pab': { slug: 'pab', action: 'venue', target: 'pub' },
  'steakhouse': { slug: 'steakhouse', action: 'venue', target: 'steakhouse' },

  // ═══ SPECIALIZATIONS (dishes, drinks, food types) ═══
  'raw-menyu': { slug: 'raw-menyu', action: 'spec', target: 'raw-menu', icon: '🥗' },
  'barbekyu': { slug: 'barbekyu', action: 'spec', target: 'barbecue', icon: '🔥' },
  'bliny': { slug: 'bliny', action: 'spec', target: 'bliny', icon: '🥞' },
  'blyuda-iz-dichi': { slug: 'blyuda-iz-dichi', action: 'spec', target: 'game-meat', icon: '🦌' },
  'blyuda-na-ogne': { slug: 'blyuda-na-ogne', action: 'spec', target: 'fire-cooked', icon: '🔥' },
  'borshch': { slug: 'borshch', action: 'spec', target: 'borshch', icon: '🍲' },
  'bouly': { slug: 'bouly', action: 'spec', target: 'bowls', icon: '🥣' },
  'burgery': { slug: 'burgery', action: 'spec', target: 'burgers', icon: '🍔' },
  'vafli': { slug: 'vafli', action: 'spec', target: 'waffles', icon: '🧇' },
  'vino': { slug: 'vino', action: 'spec', target: 'wine', icon: '🍷' },
  'vok': { slug: 'vok', action: 'spec', target: 'wok', icon: '🥘' },
  'deserty': { slug: 'deserty', action: 'spec', target: 'desserts', icon: '🍰' },
  'zakuski': { slug: 'zakuski', action: 'spec', target: 'zakuski', icon: '🍢' },
  'koryushka': { slug: 'koryushka', action: 'spec', target: 'smelt', icon: '🐟' },
  'kraby': { slug: 'kraby', action: 'spec', target: 'crabs', icon: '🦀' },
  'kraftovoe-pivo': { slug: 'kraftovoe-pivo', action: 'spec', target: 'craft-beer', icon: '🍺' },
  'kruassany': { slug: 'kruassany', action: 'spec', target: 'croissants', icon: '🥐' },
  'lagman': { slug: 'lagman', action: 'spec', target: 'lagman', icon: '🍜' },
  'lapsha': { slug: 'lapsha', action: 'spec', target: 'noodles', icon: '🍜' },
  'lobstery': { slug: 'lobstery', action: 'spec', target: 'lobsters', icon: '🦞' },
  'midii': { slug: 'midii', action: 'spec', target: 'mussels', icon: '🦪' },
  'molekulyarnaya': { slug: 'molekulyarnaya', action: 'spec', target: 'molecular', icon: '🧪' },
  'molochnye-kokteyli': { slug: 'molochnye-kokteyli', action: 'spec', target: 'milkshakes', icon: '🥛' },
  'morozhenoe': { slug: 'morozhenoe', action: 'spec', target: 'ice-cream', icon: '🍦' },
  'nastoyki': { slug: 'nastoyki', action: 'spec', target: 'tinctures', icon: '🥃' },
  'pasta': { slug: 'pasta', action: 'spec', target: 'pasta', icon: '🍝' },
  'parovye-kokteyli': { slug: 'parovye-kokteyli', action: 'spec', target: 'hookah', icon: '💨' },
  'pelmeni': { slug: 'pelmeni', action: 'spec', target: 'pelmeni', icon: '🥟' },
  'pivo': { slug: 'pivo', action: 'spec', target: 'beer', icon: '🍺' },
  'pirogi': { slug: 'pirogi', action: 'spec', target: 'pies', icon: '🥧' },
  'pitstsa': { slug: 'pitstsa', action: 'spec', target: 'pizza', icon: '🍕' },
  'poke': { slug: 'poke', action: 'spec', target: 'poke', icon: '🥣' },
  'ponchiki': { slug: 'ponchiki', action: 'spec', target: 'donuts', icon: '🍩' },
  'pyshki': { slug: 'pyshki', action: 'spec', target: 'pyshki', icon: '🍩' },
  'raki': { slug: 'raki', action: 'spec', target: 'crayfish', icon: '🦞' },
  'ramen': { slug: 'ramen', action: 'spec', target: 'ramen', icon: '🍜' },
  'ryba-i-moreprodukty': { slug: 'ryba-i-moreprodukty', action: 'spec', target: 'seafood', icon: '🐟' },
  'seafood': { slug: 'seafood', action: 'spec', target: 'seafood', icon: '🐟' },
  'sladosti': { slug: 'sladosti', action: 'spec', target: 'sweets', icon: '🍬' },
  'solyanka': { slug: 'solyanka', action: 'spec', target: 'solyanka', icon: '🍲' },
  'speshelti-kofe': { slug: 'speshelti-kofe', action: 'spec', target: 'specialty-coffee', icon: '☕' },
  'steyki': { slug: 'steyki', action: 'spec', target: 'steaks', icon: '🥩' },
  'stritfud': { slug: 'stritfud', action: 'spec', target: 'street-food', icon: '🌮' },
  'suvlaki': { slug: 'suvlaki', action: 'spec', target: 'souvlaki', icon: '🍢' },
  'sushi': { slug: 'sushi', action: 'spec', target: 'sushi', icon: '🍣' },
  'sendvichi': { slug: 'sendvichi', action: 'spec', target: 'sandwiches', icon: '🥪' },
  'tom-yam': { slug: 'tom-yam', action: 'spec', target: 'tom-yam', icon: '🍲' },
  'torty-na-zakaz': { slug: 'torty-na-zakaz', action: 'spec', target: 'custom-cakes', icon: '🎂' },
  'ustritsy': { slug: 'ustritsy', action: 'spec', target: 'oysters', icon: '🦪' },
  'falafel': { slug: 'falafel', action: 'spec', target: 'falafel', icon: '🧆' },
  'khachapuri': { slug: 'khachapuri', action: 'spec', target: 'khachapuri', icon: '🫓' },
  'khachapuri-po-adzharski': { slug: 'khachapuri-po-adzharski', action: 'spec', target: 'khachapuri', icon: '🫓' },
  'khinkali': { slug: 'khinkali', action: 'spec', target: 'khinkali', icon: '🥟' },
  'chebureki': { slug: 'chebureki', action: 'spec', target: 'chebureki', icon: '🥟' },
  'chizkeyk': { slug: 'chizkeyk', action: 'spec', target: 'cheesecake', icon: '🍰' },
  'shaverma': { slug: 'shaverma', action: 'spec', target: 'shawarma', icon: '🌯' },
  'shaurma': { slug: 'shaurma', action: 'spec', target: 'shawarma', icon: '🌯' },
  'shashlyki': { slug: 'shashlyki', action: 'spec', target: 'shashlik', icon: '🍢' },
  'shvedskiy-stol': { slug: 'shvedskiy-stol', action: 'spec', target: 'buffet', icon: '🍽️' },
  'eklery': { slug: 'eklery', action: 'spec', target: 'eclairs', icon: '🥐' },
  'kokteyli': { slug: 'kokteyli', action: 'spec', target: 'cocktails', icon: '🍸' },
  'kokteylnaya-karta': { slug: 'kokteylnaya-karta', action: 'spec', target: 'cocktails', icon: '🍸' },
  'sidr': { slug: 'sidr', action: 'spec', target: 'cider', icon: '🍎' },
  'narodov-severa': { slug: 'narodov-severa', action: 'keep' },

  // ═══ DIETARY ═══
  'vegetarian': { slug: 'vegetarian', action: 'dietary', target: 'vegetarian', icon: '🥬' },
  'veganskaya': { slug: 'veganskaya', action: 'dietary', target: 'vegan', icon: '🌱' },
  'khalyal': { slug: 'khalyal', action: 'dietary', target: 'halal', icon: '☪️' },
  'khalyalnaya': { slug: 'khalyalnaya', action: 'dietary', target: 'halal', icon: '☪️' },
  'zdorovoe-pitanie': { slug: 'zdorovoe-pitanie', action: 'dietary', target: 'healthy', icon: '💚' },
  'pravilnoe-pitanie': { slug: 'pravilnoe-pitanie', action: 'dietary', target: 'healthy', icon: '💚' },
  'postnoe-menyu': { slug: 'postnoe-menyu', action: 'dietary', target: 'lenten', icon: '🙏' },

  // ═══ REMOVE (generic/meta) ═══
  'author': { slug: 'author', action: 'remove' },
  'smeshannaya': { slug: 'smeshannaya', action: 'remove' },
  'fusion': { slug: 'fusion', action: 'remove' },
  'letnee-menyu': { slug: 'letnee-menyu', action: 'remove' },
  'sezon-lisichek': { slug: 'sezon-lisichek', action: 'remove' },
};

// ─── Venue type extraction patterns ─────────────────────────
const VENUE_PATTERNS: Array<{ pattern: RegExp; type: string; label: string }> = [
  { pattern: /\bгастропаб/i, type: 'gastropub', label: 'Гастропаб' },
  { pattern: /\bгастробар/i, type: 'gastrobar', label: 'Гастробар' },
  { pattern: /\bвинотек[аи]/i, type: 'wine-bar', label: 'Винотека' },
  { pattern: /\bвинный\s+бар/i, type: 'wine-bar', label: 'Винный бар' },
  { pattern: /\bсуши[- ]?бар/i, type: 'sushi-bar', label: 'Суши-бар' },
  { pattern: /\bспорт[- ]?бар/i, type: 'sport-bar', label: 'Спорт-бар' },
  { pattern: /\bлаунж[- ]?бар/i, type: 'lounge', label: 'Лаунж-бар' },
  { pattern: /\bкальян/i, type: 'hookah-lounge', label: 'Кальянная' },
  { pattern: /\bпиццери[яю]/i, type: 'pizzeria', label: 'Пиццерия' },
  { pattern: /\bкондитерск/i, type: 'confectionery', label: 'Кондитерская' },
  { pattern: /\bпекарн[яю]/i, type: 'bakery', label: 'Пекарня' },
  { pattern: /\bбулочн/i, type: 'bakery', label: 'Пекарня' },
  { pattern: /\bкофейн[яю]/i, type: 'coffeehouse', label: 'Кофейня' },
  { pattern: /\bчайхан[аеу]/i, type: 'teahouse', label: 'Чайхана' },
  { pattern: /\bчайн/i, type: 'teahouse', label: 'Чайная' },
  { pattern: /\bстоловая/i, type: 'canteen', label: 'Столовая' },
  { pattern: /\bбистро/i, type: 'bistro', label: 'Бистро' },
  { pattern: /\bтрактир/i, type: 'tavern', label: 'Трактир' },
  { pattern: /\bтаверн/i, type: 'tavern', label: 'Таверна' },
  { pattern: /\bшашлычн/i, type: 'shashlik-house', label: 'Шашлычная' },
  { pattern: /\bфастфуд|\bфаст[- ]?фуд|\bбыстрого питания/i, type: 'fastfood', label: 'Фастфуд' },
  { pattern: /\bбар\b/i, type: 'bar', label: 'Бар' },
  { pattern: /\bпаб\b/i, type: 'pub', label: 'Паб' },
  { pattern: /\bкафе\b/i, type: 'cafe', label: 'Кафе' },
  { pattern: /\bресторан/i, type: 'restaurant', label: 'Ресторан' },
];

// ─── Cuisine extraction from descriptions ───────────────────
const CUISINE_PATTERNS: Array<{ pattern: RegExp; cuisineSlug: string }> = [
  { pattern: /итальянск/i, cuisineSlug: 'italian' },
  { pattern: /японск/i, cuisineSlug: 'japanese' },
  { pattern: /грузинск/i, cuisineSlug: 'georgian' },
  { pattern: /французск/i, cuisineSlug: 'french' },
  { pattern: /русск/i, cuisineSlug: 'russian' },
  { pattern: /узбекск/i, cuisineSlug: 'uzbek' },
  { pattern: /китайск/i, cuisineSlug: 'chinese' },
  { pattern: /мексиканск/i, cuisineSlug: 'mexican' },
  { pattern: /индийск/i, cuisineSlug: 'indian' },
  { pattern: /турецк/i, cuisineSlug: 'turkish' },
  { pattern: /европейск/i, cuisineSlug: 'european' },
  { pattern: /кавказск/i, cuisineSlug: 'caucasian' },
  { pattern: /азербайджанск/i, cuisineSlug: 'azerbaydzhanskaya' },
  { pattern: /армянск/i, cuisineSlug: 'armyanskaya' },
  { pattern: /корейск/i, cuisineSlug: 'koreyskaya' },
  { pattern: /вьетнамск/i, cuisineSlug: 'vetnamskaya' },
  { pattern: /тайск/i, cuisineSlug: 'tayskaya' },
  { pattern: /паназиатск/i, cuisineSlug: 'pan-asian' },
  { pattern: /средиземноморск/i, cuisineSlug: 'mediterranean' },
  { pattern: /испанск/i, cuisineSlug: 'ispanskaya' },
  { pattern: /американск/i, cuisineSlug: 'american' },
  { pattern: /немецк/i, cuisineSlug: 'nemetskaya' },
  { pattern: /чешск/i, cuisineSlug: 'cheshskaya' },
  { pattern: /сербск/i, cuisineSlug: 'serbskaya' },
  { pattern: /греческ/i, cuisineSlug: 'grecheskaya' },
  { pattern: /арабск/i, cuisineSlug: 'arabskaya' },
  { pattern: /татарск/i, cuisineSlug: 'tatarskaya' },
  { pattern: /украинск/i, cuisineSlug: 'ukrainskaya' },
  { pattern: /белорусск/i, cuisineSlug: 'belorusskaya' },
];

// ─── Description cleanup patterns ───────────────────────────
const HOURS_PATTERNS = [
  // "пн-пт 10:00-22:00" and variants
  /(?:(?:пн|вт|ср|чт|пт|сб|вс|ежедневно)[а-яё.]*\s*[-–—]\s*(?:пн|вт|ср|чт|пт|сб|вс|ежедневно)[а-яё.]*\s*)?(?:\d{1,2}[:.]\d{2}\s*[-–—]\s*\d{1,2}[:.]\d{2})/gi,
  // "Режим работы:" / "Часы работы:" sections
  /(?:режим|часы|время|график)\s+работы[:\s]*[^\n]{0,100}/gi,
  // "Работает: ..." / "Открыто с ..."
  /работает\s*[:]\s*[^\n]{0,80}/gi,
  /открыт[оа]?\s+(?:с|ежедневно)\s+[^\n]{0,60}/gi,
];

const SOURCE_PATTERNS = [
  /(?:по (?:данным|информации|версии) )?(?:afisha\.ru|«?афиша»?|restoclub\.ru|«?ресторанный клуб»?|the-village|timeout|timeou\.ru)[^\n.]{0,50}[.\n]?/gi,
  /(?:источник|подробнее|больше информации)[:\s]*(?:afisha|restoclub|timeout)[^\n]{0,80}/gi,
  /https?:\/\/(?:www\.)?(?:afisha\.ru|restoclub\.ru|the-village\.ru|timeout\.ru)[^\s)"]*/gi,
];

async function run() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ─── Step 0: Add venue_type column if not exists ─────────
    console.log('Step 0: Adding venue_type column...');
    await client.query(`
      ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS venue_type varchar(50);
      CREATE INDEX IF NOT EXISTS idx_restaurants_venue_type ON restaurants(venue_type);
    `);

    // ─── Step 1: Load all cuisine mappings ───────────────────
    console.log('Step 1: Loading cuisine data...');
    const { rows: allCuisines } = await client.query('SELECT id, name, slug FROM cuisines ORDER BY name');
    console.log(`  ${allCuisines.length} cuisines in DB`);

    // Check for unclassified cuisines
    const unclassified = allCuisines.filter(c => !CLASSIFICATIONS[c.slug]);
    if (unclassified.length > 0) {
      console.log('  WARNING: Unclassified cuisines:');
      for (const c of unclassified) console.log(`    ${c.name} (${c.slug})`);
    }

    // ─── Step 2: Create specialization features ──────────────
    console.log('Step 2: Creating specialization features...');
    const specEntries = new Map<string, { slug: string; name: string; icon: string }>();
    for (const [, cl] of Object.entries(CLASSIFICATIONS)) {
      if (cl.action === 'spec' && cl.target) {
        if (!specEntries.has(cl.target)) {
          const cuisine = allCuisines.find(c => c.slug === cl.slug);
          specEntries.set(cl.target, {
            slug: cl.target,
            name: cuisine?.name || cl.target,
            icon: cl.icon || '🍽️'
          });
        }
      }
    }

    for (const [, entry] of specEntries) {
      await client.query(`
        INSERT INTO features (name, slug, category, icon)
        VALUES ($1, $2, 'specialization', $3)
        ON CONFLICT (slug) DO UPDATE SET category = 'specialization', icon = EXCLUDED.icon
      `, [entry.name, entry.slug, entry.icon]);
    }
    console.log(`  Created ${specEntries.size} specialization features`);

    // ─── Step 3: Create dietary features ─────────────────────
    console.log('Step 3: Creating dietary features...');
    const dietaryEntries = new Map<string, { slug: string; name: string; icon: string }>();
    for (const [, cl] of Object.entries(CLASSIFICATIONS)) {
      if (cl.action === 'dietary' && cl.target) {
        if (!dietaryEntries.has(cl.target)) {
          const cuisine = allCuisines.find(c => c.slug === cl.slug);
          dietaryEntries.set(cl.target, {
            slug: cl.target,
            name: cuisine?.name || cl.target,
            icon: cl.icon || '🌿'
          });
        }
      }
    }

    for (const [, entry] of dietaryEntries) {
      await client.query(`
        INSERT INTO features (name, slug, category, icon)
        VALUES ($1, $2, 'dietary', $3)
        ON CONFLICT (slug) DO UPDATE SET category = 'dietary', icon = EXCLUDED.icon
      `, [entry.name, entry.slug, entry.icon]);
    }
    console.log(`  Created ${dietaryEntries.size} dietary features`);

    // ─── Step 4: Move venue-type cuisines → restaurants.venue_type ──
    console.log('Step 4: Setting venue_type from cuisine tags...');
    let venueFromCuisine = 0;
    for (const [cuisineSlug, cl] of Object.entries(CLASSIFICATIONS)) {
      if (cl.action !== 'venue' || !cl.target) continue;
      const cuisine = allCuisines.find(c => c.slug === cuisineSlug);
      if (!cuisine) continue;

      const res = await client.query(`
        UPDATE restaurants SET venue_type = $1
        WHERE venue_type IS NULL
          AND id IN (SELECT restaurant_id FROM restaurant_cuisines WHERE cuisine_id = $2)
      `, [cl.target, cuisine.id]);
      venueFromCuisine += res.rowCount || 0;
    }
    console.log(`  Set venue_type for ${venueFromCuisine} restaurants from cuisine tags`);

    // ─── Step 5: Move specializations → features ─────────────
    console.log('Step 5: Moving specializations to features...');
    let specMoved = 0;
    for (const [cuisineSlug, cl] of Object.entries(CLASSIFICATIONS)) {
      if (cl.action !== 'spec' || !cl.target) continue;
      const cuisine = allCuisines.find(c => c.slug === cuisineSlug);
      if (!cuisine) continue;

      const { rows: [feature] } = await client.query('SELECT id FROM features WHERE slug = $1', [cl.target]);
      if (!feature) continue;

      const res = await client.query(`
        INSERT INTO restaurant_features (restaurant_id, feature_id)
        SELECT rc.restaurant_id, $1
        FROM restaurant_cuisines rc
        WHERE rc.cuisine_id = $2
        ON CONFLICT DO NOTHING
      `, [feature.id, cuisine.id]);
      specMoved += res.rowCount || 0;
    }
    console.log(`  Created ${specMoved} restaurant-specialization links`);

    // ─── Step 6: Move dietary → features ─────────────────────
    console.log('Step 6: Moving dietary labels to features...');
    let dietMoved = 0;
    for (const [cuisineSlug, cl] of Object.entries(CLASSIFICATIONS)) {
      if (cl.action !== 'dietary' || !cl.target) continue;
      const cuisine = allCuisines.find(c => c.slug === cuisineSlug);
      if (!cuisine) continue;

      const { rows: [feature] } = await client.query('SELECT id FROM features WHERE slug = $1', [cl.target]);
      if (!feature) continue;

      const res = await client.query(`
        INSERT INTO restaurant_features (restaurant_id, feature_id)
        SELECT rc.restaurant_id, $1
        FROM restaurant_cuisines rc
        WHERE rc.cuisine_id = $2
        ON CONFLICT DO NOTHING
      `, [feature.id, cuisine.id]);
      dietMoved += res.rowCount || 0;
    }
    console.log(`  Created ${dietMoved} restaurant-dietary links`);

    // ─── Step 7: Remove non-national cuisine links ───────────
    console.log('Step 7: Removing non-national cuisine links...');
    const nonNationalIds: number[] = [];
    for (const cuisine of allCuisines) {
      const cl = CLASSIFICATIONS[cuisine.slug];
      if (cl && cl.action !== 'keep') {
        nonNationalIds.push(cuisine.id);
      }
    }
    if (nonNationalIds.length > 0) {
      const res = await client.query(
        `DELETE FROM restaurant_cuisines WHERE cuisine_id = ANY($1)`,
        [nonNationalIds]
      );
      console.log(`  Removed ${res.rowCount} restaurant_cuisines links for ${nonNationalIds.length} non-national cuisines`);
    }

    // ─── Step 8: Extract venue_type from descriptions ────────
    console.log('Step 8: Extracting venue_type from descriptions...');
    const { rows: noVenue } = await client.query(
      `SELECT id, name, description FROM restaurants WHERE venue_type IS NULL AND description IS NOT NULL`
    );
    let venueFromDesc = 0;
    for (const r of noVenue) {
      const text = `${r.name} ${r.description || ''}`;
      for (const vp of VENUE_PATTERNS) {
        if (vp.pattern.test(text)) {
          await client.query('UPDATE restaurants SET venue_type = $1 WHERE id = $2', [vp.type, r.id]);
          venueFromDesc++;
          break;
        }
      }
    }
    console.log(`  Set venue_type for ${venueFromDesc} restaurants from descriptions`);

    // Also from name alone for remaining
    const { rows: stillNoVenue } = await client.query(
      `SELECT id, name FROM restaurants WHERE venue_type IS NULL`
    );
    let venueFromName = 0;
    for (const r of stillNoVenue) {
      for (const vp of VENUE_PATTERNS) {
        if (vp.pattern.test(r.name)) {
          await client.query('UPDATE restaurants SET venue_type = $1 WHERE id = $2', [vp.type, r.id]);
          venueFromName++;
          break;
        }
      }
    }
    console.log(`  Set venue_type for ${venueFromName} restaurants from names`);

    // Default: restaurant for remaining
    const defRes = await client.query(
      `UPDATE restaurants SET venue_type = 'restaurant' WHERE venue_type IS NULL`
    );
    console.log(`  Default 'restaurant' for ${defRes.rowCount} remaining`);

    // ─── Step 9: Extract cuisines from descriptions ──────────
    console.log('Step 9: Extracting cuisines from descriptions...');
    const { rows: noCuisine } = await client.query(`
      SELECT r.id, r.description FROM restaurants r
      WHERE r.description IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM restaurant_cuisines rc WHERE rc.restaurant_id = r.id)
    `);
    console.log(`  ${noCuisine.length} restaurants with description but no cuisines`);

    let cuisineExtracted = 0;
    for (const r of noCuisine) {
      for (const cp of CUISINE_PATTERNS) {
        if (cp.pattern.test(r.description || '')) {
          const { rows: [cuisine] } = await client.query('SELECT id FROM cuisines WHERE slug = $1', [cp.cuisineSlug]);
          if (cuisine) {
            await client.query(
              'INSERT INTO restaurant_cuisines (restaurant_id, cuisine_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [r.id, cuisine.id]
            );
            cuisineExtracted++;
          }
        }
      }
    }
    console.log(`  Extracted ${cuisineExtracted} cuisine links from descriptions`);

    // ─── Step 10: Clean descriptions ─────────────────────────
    console.log('Step 10: Cleaning descriptions...');
    const { rows: descs } = await client.query(
      `SELECT id, description FROM restaurants WHERE description IS NOT NULL`
    );
    let descCleaned = 0;
    for (const r of descs) {
      let d = r.description;
      let changed = false;

      // Remove hours
      for (const pat of HOURS_PATTERNS) {
        const before = d;
        d = d.replace(pat, '');
        if (d !== before) changed = true;
      }

      // Remove source mentions
      for (const pat of SOURCE_PATTERNS) {
        const before = d;
        d = d.replace(pat, '');
        if (d !== before) changed = true;
      }

      // Clean up extra whitespace
      if (changed) {
        d = d.replace(/\n{3,}/g, '\n\n').replace(/  +/g, ' ').trim();
        await client.query('UPDATE restaurants SET description = $1 WHERE id = $2', [d, r.id]);
        descCleaned++;
      }
    }
    console.log(`  Cleaned ${descCleaned} descriptions`);

    // ─── Step 11: Delete orphaned cuisine rows ───────────────
    console.log('Step 11: Deleting orphaned non-national cuisines...');
    const delRes = await client.query(`
      DELETE FROM cuisines
      WHERE id = ANY($1)
        AND NOT EXISTS (SELECT 1 FROM restaurant_cuisines rc WHERE rc.cuisine_id = cuisines.id)
    `, [nonNationalIds]);
    console.log(`  Deleted ${delRes.rowCount} orphaned cuisine rows`);

    // ─── Step 12: Stats ──────────────────────────────────────
    const { rows: [stats] } = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM cuisines) as cuisines,
        (SELECT COUNT(DISTINCT venue_type) FROM restaurants WHERE venue_type IS NOT NULL) as venue_types,
        (SELECT COUNT(*) FROM features WHERE category = 'specialization') as specializations,
        (SELECT COUNT(*) FROM features WHERE category = 'dietary') as dietary,
        (SELECT COUNT(*) FROM restaurants WHERE venue_type IS NOT NULL) as with_venue,
        (SELECT COUNT(DISTINCT rc.restaurant_id) FROM restaurant_cuisines rc) as with_cuisine,
        (SELECT COUNT(DISTINCT rf.restaurant_id) FROM restaurant_features rf JOIN features f ON f.id = rf.feature_id WHERE f.category = 'specialization') as with_spec
    `);
    console.log('\n=== FINAL STATS ===');
    console.log(`  National cuisines: ${stats.cuisines}`);
    console.log(`  Venue types: ${stats.venue_types}`);
    console.log(`  Specialization features: ${stats.specializations}`);
    console.log(`  Dietary features: ${stats.dietary}`);
    console.log(`  Restaurants with venue_type: ${stats.with_venue}`);
    console.log(`  Restaurants with cuisine: ${stats.with_cuisine}`);
    console.log(`  Restaurants with specialization: ${stats.with_spec}`);

    await client.query('COMMIT');
    console.log('\nDone!');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('ROLLED BACK:', e);
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
