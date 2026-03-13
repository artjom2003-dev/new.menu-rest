/**
 * Первый проход: быстрое извлечение параметров из запроса
 * без вызова LLM (regex + словари).
 * Покрывает ~60-70% запросов.
 */

export interface ExtractedParams {
  location?: string;
  cuisine?: string;
  dietary?: string[];
  budget?: { max: number; per?: 'person' | 'couple' };
  occasion?: string;
  atmosphere?: string;
  venueType?: string;
  confidence: number; // 0–1
}

const LOCATION_MAP: Record<string, string> = {
  'центр': 'center', 'тверской': 'tverskoy', 'тверская': 'tverskoy',
  'патриарши': 'patriarshie', 'патриаршие': 'patriarshie',
  'арбат': 'arbat', 'китай-город': 'kitay-gorod', 'китайгород': 'kitay-gorod',
  'таганка': 'taganskaya', 'остоженка': 'ostozhenka',
  'замоскворечье': 'zamoskvorechye', 'хамовники': 'khamovniki',
  'бауманская': 'baumanskaya', 'красные ворота': 'krasnye-vorota',
  'москва': 'moscow', 'спб': 'spb', 'петербург': 'spb', 'санкт-петербург': 'spb',
};

const CUISINE_MAP: Record<string, string> = {
  'итальян': 'italian', 'пицц': 'italian', 'паст': 'italian', 'ризотто': 'italian',
  'японск': 'japanese', 'суши': 'japanese', 'роллы': 'japanese', 'сашими': 'japanese',
  'грузинск': 'georgian', 'хинкали': 'georgian', 'хачапури': 'georgian',
  'французск': 'french',
  'русск': 'russian',
  'узбекск': 'uzbek', 'плов': 'uzbek', 'лагман': 'uzbek',
  'стейк': 'steakhouse', 'мраморн': 'steakhouse', 'рибай': 'steakhouse',
  'морепродукт': 'seafood', 'рыб': 'seafood', 'краб': 'seafood', 'осьминог': 'seafood',
  'азиатск': 'pan-asian', 'том-ям': 'pan-asian', 'паназиатск': 'pan-asian',
  'китайск': 'chinese',
  'бургер': 'american',
};

const DIETARY_MAP: Record<string, string> = {
  'веган': 'vegan', 'веганск': 'vegan',
  'вегетариан': 'vegetarian',
  'без глютен': 'gluten-free', 'безглютен': 'gluten-free',
  'без лактоз': 'lactose-free', 'безлактоз': 'lactose-free',
  'без молок': 'lactose-free',
  'халяль': 'halal',
  'зож': 'healthy', 'кбжу': 'healthy', 'правильное питани': 'healthy',
  'без орехов': 'nut-free', 'без арахис': 'nut-free',
  'детское меню': 'kids-menu', 'детским меню': 'kids-menu',
};

const OCCASION_MAP: Record<string, string> = {
  'свидани': 'romantic', 'романтическ': 'romantic', 'романтик': 'romantic',
  'день рожден': 'birthday', 'юбилей': 'birthday',
  'деловой': 'business', 'деловая встреч': 'business', 'бизнес': 'business',
  'с друзьями': 'friends', 'компани': 'friends',
  'с детьми': 'kids', 'детьми': 'kids', 'ребёнк': 'kids',
  'банкет': 'banquet', 'корпоратив': 'corporate',
};

const ATMOSPHERE_MAP: Record<string, string> = {
  'уютн': 'cozy', 'камерн': 'cozy',
  'терраса': 'terrace', 'открытая': 'terrace',
  'с видом': 'with-view', 'панорам': 'with-view', 'крыш': 'rooftop',
  'живая музык': 'live-music',
  'тихий': 'quiet', 'тихо': 'quiet',
};

const VENUE_MAP: Record<string, string> = {
  'ресторан': 'restaurant',
  'кафе': 'cafe',
  'бар': 'bar',
  'кофейня': 'coffeehouse',
  'гастробар': 'gastropub',
  'бистро': 'bistro',
};

const BUDGET_REGEX = /(?:до|не более|максимум|бюджет[:\s]+)\s*(\d[\d\s]*)\s*(?:₽|руб|рублей?)?(?:\s+(?:на двоих?|на двух|на человека|на персону|pp|на осн))?/gi;

function matchMap(text: string, map: Record<string, string>): string | undefined {
  const t = text.toLowerCase();
  for (const [key, value] of Object.entries(map)) {
    if (t.includes(key)) return value;
  }
}

function matchAllMap(text: string, map: Record<string, string>): string[] {
  const t = text.toLowerCase();
  const found = new Set<string>();
  for (const [key, value] of Object.entries(map)) {
    if (t.includes(key)) found.add(value);
  }
  return [...found];
}

export function extractKeywords(query: string): ExtractedParams {
  const params: ExtractedParams = { confidence: 0 };
  let hits = 0;

  const location = matchMap(query, LOCATION_MAP);
  if (location) { params.location = location; hits++; }

  const cuisine = matchMap(query, CUISINE_MAP);
  if (cuisine) { params.cuisine = cuisine; hits++; }

  const dietary = matchAllMap(query, DIETARY_MAP);
  if (dietary.length) { params.dietary = dietary; hits++; }

  const occasion = matchMap(query, OCCASION_MAP);
  if (occasion) { params.occasion = occasion; hits++; }

  const atmosphere = matchMap(query, ATMOSPHERE_MAP);
  if (atmosphere) { params.atmosphere = atmosphere; hits++; }

  const venueType = matchMap(query, VENUE_MAP);
  if (venueType) { params.venueType = venueType; hits++; }

  // Budget
  const budgetMatch = BUDGET_REGEX.exec(query);
  if (budgetMatch) {
    const amount = parseInt(budgetMatch[1].replace(/\s/g, ''), 10);
    const isCouple = /двоих?|двух/i.test(budgetMatch[0]);
    params.budget = {
      max: isCouple ? Math.round(amount / 2) : amount,
      per: isCouple ? 'couple' : 'person',
    };
    hits++;
  }

  // Confidence: если нашли 3+ параметра — не нужен LLM
  params.confidence = Math.min(hits / 3, 1);

  return params;
}
