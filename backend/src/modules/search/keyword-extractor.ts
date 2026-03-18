/**
 * Первый проход: быстрое извлечение параметров из запроса
 * без вызова LLM (regex + словари).
 * Покрывает ~80-90% запросов.
 */

export interface ExtractedParams {
  location?: string;
  rawLocation?: string; // Original location text for fuzzy DB search
  cuisine?: string;
  dish?: string;
  relatedDishes?: string[]; // Semantically related dishes to broaden search
  dietary?: string[];
  budget?: { max: number; per?: 'person' | 'couple' };
  occasion?: string;
  atmosphere?: string;
  venueType?: string;
  confidence: number; // 0–1
}

const LOCATION_MAP: Record<string, string> = {
  // Московские районы / метро
  'центр': 'center', 'центре': 'center',
  'тверской': 'tverskoy', 'тверская': 'tverskoy', 'тверскую': 'tverskoy',
  'патриарши': 'patriarshie', 'патриаршие': 'patriarshie', 'патриках': 'patriarshie',
  'арбат': 'arbat', 'арбате': 'arbat',
  'китай-город': 'kitay-gorod', 'китайгород': 'kitay-gorod',
  'таганка': 'taganskaya', 'таганке': 'taganskaya', 'таганской': 'taganskaya',
  'остоженка': 'ostozhenka', 'остоженке': 'ostozhenka',
  'замоскворечье': 'zamoskvorechye', 'замоскворечьe': 'zamoskvorechye',
  'хамовники': 'khamovniki', 'хамовниках': 'khamovniki',
  'бауманская': 'baumanskaya', 'бауманской': 'baumanskaya',
  'красные ворота': 'krasnye-vorota',
  'сретенка': 'sretenka', 'сретенке': 'sretenka',
  'чистые пруды': 'chistye-prudy', 'чистых прудов': 'chistye-prudy', 'чистых прудах': 'chistye-prudy',
  'кузнецкий мост': 'kuznetsky-most',
  'пушкинская': 'pushkinskaya', 'пушкинской': 'pushkinskaya',
  'маяковская': 'mayakovskaya', 'маяковской': 'mayakovskaya',
  'новослободская': 'novoslobodskaya',
  'сухаревская': 'sukharevskaya',
  'лубянка': 'lubyanka', 'лубянке': 'lubyanka',
  'кропоткинская': 'kropotkinskaya',
  'парк культуры': 'park-kultury',
  'октябрьская': 'oktyabrskaya',
  'добрынинская': 'dobryninskaya',
  'павелецкая': 'paveletskaya',
  'курская': 'kurskaya', 'курской': 'kurskaya',
  'комсомольская': 'komsomolskaya',
  'проспект мира': 'prospekt-mira',
  'сокол': 'sokol', 'соколе': 'sokol',
  'аэропорт': 'aeroport',
  'динамо': 'dinamo',
  'белорусская': 'belorusskaya', 'белорусской': 'belorusskaya',
  'менделеевская': 'mendeleevskaya',
  'цветной бульвар': 'tsvetnoy-bulvar',
  'трубная': 'trubnaya',
  'сокольники': 'sokolniki', 'сокольниках': 'sokolniki',
  'красносельская': 'krasnoselskaya',
  'нагатинская': 'nagatinskaya',
  'автозаводская': 'avtozavodskaya',
  'полянка': 'polyanka', 'полянке': 'polyanka',
  // Города
  'москва': 'moscow', 'москве': 'moscow', 'мск': 'moscow',
  'спб': 'spb', 'питер': 'spb', 'питере': 'spb', 'петербург': 'spb', 'санкт-петербург': 'spb',
  'казань': 'kazan', 'казани': 'kazan',
  'сочи': 'sochi',
  'нижний новгород': 'nizhny-novgorod', 'нижнем новгороде': 'nizhny-novgorod',
  'екатеринбург': 'yekaterinburg', 'екатеринбурге': 'yekaterinburg',
  'новосибирск': 'novosibirsk', 'новосибирске': 'novosibirsk',
  'краснодар': 'krasnodar', 'краснодаре': 'krasnodar',
  'ростов-на-дону': 'rostov-na-donu', 'ростове': 'rostov-na-donu',
  'самара': 'samara', 'самаре': 'samara',
  'воронеж': 'voronezh', 'воронеже': 'voronezh',
  'уфа': 'ufa', 'уфе': 'ufa',
  'калининград': 'kaliningrad', 'калининграде': 'kaliningrad',
};

const CUISINE_MAP: Record<string, string> = {
  'итальян': 'italian', 'пицц': 'italian', 'пасту': 'italian', 'паста': 'italian', 'ризотто': 'italian', 'карбонар': 'italian',
  'японск': 'japanese', 'суши': 'japanese', 'роллы': 'japanese', 'сашими': 'japanese', 'рамен': 'japanese',
  'грузинск': 'georgian', 'хинкали': 'georgian', 'хачапури': 'georgian', 'лобио': 'georgian',
  'французск': 'french', 'круассан': 'french', 'фуа-гра': 'french',
  'русск': 'russian', 'борщ': 'russian', 'пельмени': 'russian', 'блины': 'russian',
  'узбекск': 'uzbek', 'плов': 'uzbek', 'лагман': 'uzbek', 'манты': 'uzbek', 'самса': 'uzbek',
  'стейк': 'steakhouse', 'мраморн': 'steakhouse', 'рибай': 'steakhouse', 'филе-миньон': 'steakhouse',
  'морепродукт': 'seafood', 'рыбн': 'seafood', 'краб': 'seafood', 'осьминог': 'seafood', 'устриц': 'seafood', 'мидии': 'seafood', 'креветк': 'seafood',
  'азиатск': 'pan-asian', 'том-ям': 'pan-asian', 'паназиатск': 'pan-asian', 'пад-тай': 'pan-asian', 'вок': 'pan-asian',
  'китайск': 'chinese', 'дим-сам': 'chinese', 'утка по-пекински': 'chinese',
  'американск': 'american',
  'индийск': 'indian', 'карри': 'indian', 'тикка': 'indian', 'масала': 'indian', 'наан': 'indian',
  'тайск': 'thai',
  'корейск': 'korean', 'кимчи': 'korean', 'бибимбап': 'korean',
  'армянск': 'armenian', 'долма': 'armenian', 'лаваш': 'armenian',
  'турецк': 'turkish', 'кебаб': 'turkish', 'донер': 'turkish', 'шаурм': 'turkish',
  'мексиканск': 'mexican', 'такос': 'mexican', 'буррито': 'mexican', 'начос': 'mexican',
  'испанск': 'spanish', 'тапас': 'spanish', 'паэлья': 'spanish',
  'греческ': 'greek', 'мусака': 'greek', 'сувлаки': 'greek',
  'средиземноморск': 'mediterranean',
  'азербайджанск': 'azerbaijani',
  'перуанск': 'peruvian', 'севиче': 'peruvian',
  'вьетнамск': 'vietnamese', 'фо бо': 'vietnamese', 'фо-бо': 'vietnamese',
  'немецк': 'german',
  'чешск': 'czech',
  'еврейск': 'jewish', 'кошерн': 'jewish',
};

const DISH_MAP: Record<string, string> = {
  'пицц': 'пицца', 'паст': 'паста', 'ризотто': 'ризотто', 'карбонар': 'карбонара',
  'суши': 'суши', 'роллы': 'роллы', 'сашими': 'сашими', 'рамен': 'рамен',
  'хинкали': 'хинкали', 'хачапури': 'хачапури', 'шашлык': 'шашлык',
  'борщ': 'борщ', 'пельмени': 'пельмени', 'блины': 'блины',
  'плов': 'плов', 'лагман': 'лагман', 'манты': 'манты', 'самса': 'самса',
  'стейк': 'стейк', 'рибай': 'рибай',
  'бургер': 'бургер',
  'том-ям': 'том-ям', 'пад-тай': 'пад-тай',
  'карри': 'карри', 'тикка': 'тикка масала',
  'кимчи': 'кимчи',
  'долма': 'долма',
  'кебаб': 'кебаб', 'шаурм': 'шаурма',
  'такос': 'такос', 'буррито': 'буррито',
  'тапас': 'тапас', 'паэлья': 'паэлья',
  'севиче': 'севиче',
  'фо бо': 'фо бо', 'фо-бо': 'фо бо',
  'устриц': 'устрицы', 'мидии': 'мидии', 'креветк': 'креветки',
  'утка по-пекински': 'утка по-пекински',
  'дим-сам': 'дим-самы',
  'круассан': 'круассан', 'фуа-гра': 'фуа-гра',
  'тирамису': 'тирамису', 'чизкейк': 'чизкейк',
  'цезар': 'цезарь', 'caesar': 'цезарь',
  'оливье': 'оливье', 'солянк': 'солянка', 'окрошк': 'окрошка',
  'медовик': 'медовик',
  'том кха': 'том кха', 'вонтон': 'вонтоны',
  'сырник': 'сырники', 'каша': 'каша', 'запеканк': 'запеканка',
  'салат': 'салат', 'шницель': 'шницель', 'котлет': 'котлеты',
  'пирож': 'пирожки', 'чебурек': 'чебуреки', 'беляш': 'беляши',
  'торт': 'торт', 'десерт': 'десерт', 'эклер': 'эклер', 'макарон': 'макарон',
  'панна-кот': 'панна-котта', 'панакот': 'панна-котта', 'брауни': 'брауни',
  'мороженое': 'мороженое', 'мороженн': 'мороженое', 'пломбир': 'мороженое',
  'вафл': 'вафли', 'штрудел': 'штрудель', 'профитрол': 'профитроли',
  'капкейк': 'капкейк', 'маффин': 'маффин', 'трюфел': 'трюфель',
  'пончик': 'пончик', 'донат': 'пончик',
};

// Semantically related dishes: when user searches X, also look for these
const RELATED_DISHES: Record<string, string[]> = {
  'торт': ['тирамису', 'чизкейк', 'медовик', 'брауни', 'эклер', 'штрудель', 'десерт', 'пирожн', 'капкейк', 'профитрол', 'панна-котт'],
  'десерт': ['торт', 'тирамису', 'чизкейк', 'медовик', 'брауни', 'эклер', 'мороженое', 'панна-котт', 'штрудель', 'профитрол'],
  'мороженое': ['десерт', 'сорбет', 'джелато', 'пломбир'],
  'пицца': ['кальцоне', 'фокачча'],
  'суши': ['роллы', 'сашими', 'нигири', 'сет'],
  'роллы': ['суши', 'сашими', 'нигири', 'сет'],
  'бургер': ['чизбургер', 'гамбургер', 'слайдер'],
  'стейк': ['рибай', 'филе-миньон', 'стриплойн', 'тибон', 'мясо'],
  'шашлык': ['мангал', 'кебаб', 'люля', 'гриль'],
  'кебаб': ['шашлык', 'люля', 'донер', 'шаурма'],
  'паста': ['спагетти', 'карбонара', 'болоньезе', 'лазанья', 'пенне', 'феттучин'],
  'салат': ['цезарь', 'оливье', 'греческий', 'микс'],
  'завтрак': ['каша', 'сырники', 'блины', 'омлет', 'яичница', 'круассан', 'тост', 'бенедикт'],
};

const DIETARY_MAP: Record<string, string> = {
  'веган': 'vegan', 'веганск': 'vegan',
  'вегетариан': 'vegetarian', 'растительн': 'vegetarian',
  'без глютен': 'gluten-free', 'безглютен': 'gluten-free',
  'без лактоз': 'lactose-free', 'безлактоз': 'lactose-free',
  'без молок': 'lactose-free', 'безмолочн': 'lactose-free',
  'халяль': 'halal', 'халял': 'halal',
  'кошер': 'kosher',
  'зож': 'healthy', 'кбжу': 'healthy', 'правильное питани': 'healthy', 'пп': 'healthy', 'диетическ': 'healthy',
  'без орехов': 'nut-free', 'без арахис': 'nut-free',
  'детское меню': 'kids-menu', 'детским меню': 'kids-menu',
};

const OCCASION_MAP: Record<string, string> = {
  'свидани': 'romantic', 'романтическ': 'romantic', 'романтик': 'romantic', 'романтичн': 'romantic',
  'день рожден': 'birthday', 'юбилей': 'birthday', 'днюху': 'birthday', 'др': 'birthday',
  'деловой': 'business', 'деловая встреч': 'business', 'деловую': 'business', 'бизнес-ланч': 'business', 'бизнес ланч': 'business',
  'с друзьями': 'friends', 'компани': 'friends', 'дружеск': 'friends', 'друзьями': 'friends',
  'с детьми': 'kids', 'детьми': 'kids', 'ребёнк': 'kids', 'ребенк': 'kids', 'семейн': 'kids', 'семьёй': 'kids', 'семьей': 'kids',
  'банкет': 'banquet', 'корпоратив': 'corporate', 'свадьб': 'banquet',
  'выпускн': 'banquet',
};

const ATMOSPHERE_MAP: Record<string, string> = {
  'уютн': 'cozy', 'камерн': 'cozy', 'ламповый': 'cozy',
  'террас': 'terrace', 'открытая': 'terrace', 'летник': 'terrace', 'веранд': 'terrace',
  'с видом': 'with-view', 'панорам': 'with-view', 'панорамн': 'with-view', 'видом на': 'with-view',
  'крыш': 'rooftop', 'руфтоп': 'rooftop', 'крыше': 'rooftop',
  'живая музык': 'live-music', 'живой музык': 'live-music', 'концерт': 'live-music',
  'тихий': 'quiet', 'тихо': 'quiet', 'спокойн': 'quiet',
};

const VENUE_MAP: Record<string, string> = {
  'ресторан': 'restaurant',
  'кафе': 'cafe',
  'бар ': 'bar', 'баре': 'bar', 'бару': 'bar',
  'кофейн': 'coffeehouse',
  'гастробар': 'gastropub', 'гастропаб': 'gastropub',
  'бистро': 'bistro',
  'столовая': 'canteen', 'столовой': 'canteen', 'столовую': 'canteen',
  'пекарн': 'bakery',
  'пиццери': 'pizzeria',
  'кондитерск': 'confectionery',
  'закусочн': 'snack-bar',
  'фастфуд': 'fast-food', 'фаст-фуд': 'fast-food',
  'суши-бар': 'sushi-bar',
  'винный бар': 'wine-bar', 'винотек': 'wine-bar',
  'пивной бар': 'beer-bar', 'пивн': 'beer-bar',
  'караоке': 'karaoke',
  'лаунж': 'lounge', 'кальян': 'lounge',
};

const BUDGET_REGEX = /(?:до|не более|не дороже|максимум|бюджет[:\s]*)\s*(\d[\d\s]*)\s*(?:₽|руб(?:лей)?|р\.?)?(?:\s+(?:на двоих?|на двух|за двоих?|на человека|на персону|на одного|с человека|pp|на осн))?/gi;

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

// Extract metro station from "метро Тверская" / "на м. Тверская" / "у метро Тверская"
function extractMetro(query: string): string | undefined {
  const metroMatch = query.match(/(?:(?:метро|м\.)\s+)([А-ЯЁ][а-яё\-]+(?:\s+[А-ЯЁа-яё\-]+)?)/i);
  if (metroMatch) {
    return metroMatch[1].toLowerCase().replace(/\s+/g, '-');
  }
}

// Extract location from preposition patterns: "на преображенской площади", "возле белорусской"
function extractLocationPhrase(query: string): string | undefined {
  const t = query.toLowerCase();
  // Match "на/у/возле/около + word + optional площади/улице/бульваре..."
  const patterns = [
    /(?:^|\s)(?:на|возле|около|рядом с|недалеко от|в районе)\s+([а-яё][а-яё\-]+(?:ой|ой|ом|ем|ах|ях)\s+(?:площад[иь]|улиц[аеы]|бульвар[аеу]|набережн[аяой]|проспект[аеу]|шоссе|проезд[аеу]|переулк[аеу]))/,
    /(?:^|\s)(?:на|возле|около|рядом с|недалеко от|в районе)\s+([а-яё][а-яё\-]+(?:ой|ом|ем|ах|ях|ке|не|те|де)(?:\s+[а-яё]+)?)/,
    /(?:^|\s)(?:у|около|возле) метро\s+([а-яё][а-яё\-]+(?:\s+[а-яё]+)?)/,
    /(?:станци[июя]|ст\.)\s+([а-яё][а-яё\-]+(?:\s+[а-яё]+)?)/,
  ];
  for (const pat of patterns) {
    const m = t.match(pat);
    if (m) return m[1].trim();
  }
}

export function extractKeywords(query: string): ExtractedParams {
  const params: ExtractedParams = { confidence: 0 };
  let hits = 0;

  // Location: try metro first, then general map, then fuzzy phrase extraction
  const metro = extractMetro(query);
  if (metro) {
    params.location = metro;
    params.rawLocation = metro;
    hits++;
  } else {
    const location = matchMap(query, LOCATION_MAP);
    if (location) {
      params.location = location;
      hits++;
    } else {
      // Try to extract location phrase for fuzzy DB search
      const phrase = extractLocationPhrase(query);
      if (phrase) {
        params.rawLocation = phrase;
        hits++;
      }
    }
  }

  const cuisine = matchMap(query, CUISINE_MAP);
  if (cuisine) { params.cuisine = cuisine; hits++; }

  // Dish detection + related dishes
  const dish = matchMap(query, DISH_MAP);
  if (dish) {
    params.dish = dish;
    const related = RELATED_DISHES[dish];
    if (related) params.relatedDishes = related;
  }

  const dietary = matchAllMap(query, DIETARY_MAP);
  if (dietary.length) { params.dietary = dietary; hits++; }

  const occasion = matchMap(query, OCCASION_MAP);
  if (occasion) { params.occasion = occasion; hits++; }

  const atmosphere = matchMap(query, ATMOSPHERE_MAP);
  if (atmosphere) { params.atmosphere = atmosphere; hits++; }

  const venueType = matchMap(query, VENUE_MAP);
  if (venueType) { params.venueType = venueType; hits++; }

  // Budget
  BUDGET_REGEX.lastIndex = 0; // Reset stateful regex
  const budgetMatch = BUDGET_REGEX.exec(query);
  if (budgetMatch) {
    const amount = parseInt(budgetMatch[1].replace(/\s/g, ''), 10);
    const isCouple = /двоих?|двух|за двоих/i.test(budgetMatch[0]);
    params.budget = {
      max: isCouple ? Math.round(amount / 2) : amount,
      per: isCouple ? 'couple' : 'person',
    };
    hits++;
  }

  // Confidence: если нашли 2+ параметра — высокая уверенность
  params.confidence = Math.min(hits / 2, 1);

  return params;
}
