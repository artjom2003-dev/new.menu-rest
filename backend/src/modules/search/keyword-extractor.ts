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
  // Московские районы (НЕ метро — метро вынесены в METRO_TO_CITY ниже)
  'центр': 'center', 'центре': 'center',
  'тверской': 'tverskoy', 'тверская': 'tverskoy', 'тверскую': 'tverskoy',
  'патриарши': 'patriarshie', 'патриаршие': 'patriarshie', 'патриках': 'patriarshie',
  'арбат': 'arbat', 'арбате': 'arbat',
  'китай-город': 'kitay-gorod', 'китайгород': 'kitay-gorod', 'китай город': 'kitay-gorod', 'китай-городе': 'kitay-gorod', 'китай городе': 'kitay-gorod',
  'таганка': 'taganskaya', 'таганке': 'taganskaya', 'таганской': 'taganskaya',
  'остоженка': 'ostozhenka', 'остоженке': 'ostozhenka',
  'замоскворечье': 'zamoskvorechye', 'замоскворечьe': 'zamoskvorechye',
  'хамовники': 'khamovniki', 'хамовниках': 'khamovniki',
  'красные ворота': 'krasnye-vorota', 'красных воротах': 'krasnye-vorota', 'красных ворот': 'krasnye-vorota',
  'сретенка': 'sretenka', 'сретенке': 'sretenka',
  'чистые пруды': 'chistye-prudy', 'чистых прудов': 'chistye-prudy', 'чистых прудах': 'chistye-prudy',
  'кузнецкий мост': 'kuznetsky-most', 'кузнецком мосту': 'kuznetsky-most',
  'цветной бульвар': 'tsvetnoy-bulvar', 'цветном бульваре': 'tsvetnoy-bulvar',
  'сокольники': 'sokolniki', 'сокольниках': 'sokolniki',
  // Города — slug ОБЯЗАТЕЛЬНО совпадает с city.slug в БД (см. cities.seed.ts)
  'москва': 'moscow', 'москве': 'moscow', 'мск': 'moscow',
  'спб': 'spb', 'питер': 'spb', 'питере': 'spb', 'петербург': 'spb', 'санкт-петербург': 'spb',
  'казань': 'kazan', 'казани': 'kazan',
  'сочи': 'sochi',
  'нижний новгород': 'nnov', 'нижнем новгороде': 'nnov', 'нижний': 'nnov',
  'екатеринбург': 'ekb', 'екатеринбурге': 'ekb', 'екб': 'ekb',
  'новосибирск': 'novosibirsk', 'новосибирске': 'novosibirsk',
  'краснодар': 'krasnodar', 'краснодаре': 'krasnodar',
  'красноярск': 'krasnoyarsk', 'красноярске': 'krasnoyarsk',
  'ростов-на-дону': 'rostov', 'ростове': 'rostov', 'ростов': 'rostov',
  'самара': 'samara', 'самаре': 'samara',
  'воронеж': 'voronezh', 'воронеже': 'voronezh',
  'уфа': 'ufa', 'уфе': 'ufa',
};

// Метро → город. Используется когда пользователь упоминает станцию метро без указания города:
// "хочу пиво на шаболовской" → city='moscow'. Покрывает большинство станций МСК и СПБ.
// Для уникальных в одном городе названий — однозначное соответствие. Для омонимов (Тверская,
// Маяковская, Спортивная, Парк Победы, Балтийская, Чкаловская и т.п.) НЕ ставим город,
// чтобы не схватить ошибочный — пусть либо savedCity, либо явное "москва"/"питер" решит.
const METRO_TO_CITY: Record<string, string> = {
  // ─── Москва (уникальные станции) ───
  // Сокольническая (1)
  'охотный ряд': 'moscow', 'воробьёвы горы': 'moscow', 'воробьевы горы': 'moscow',
  'юго-западная': 'moscow', 'тропарёво': 'moscow', 'тропарево': 'moscow',
  'румянцево': 'moscow', 'саларьево': 'moscow', 'филатов луг': 'moscow',
  'прокшино': 'moscow', 'ольховая': 'moscow', 'коммунарка': 'moscow',
  // Замоскворецкая (2)
  'речной вокзал': 'moscow', 'водный стадион': 'moscow', 'войковская': 'moscow',
  'сокол': 'moscow', 'аэропорт': 'moscow', 'динамо': 'moscow',
  'белорусская': 'moscow', 'белорусской': 'moscow',
  'театральная': 'moscow', 'новокузнецкая': 'moscow', 'павелецкая': 'moscow',
  'автозаводская': 'moscow', 'технопарк': 'moscow', 'коломенская': 'moscow',
  'каширская': 'moscow', 'кантемировская': 'moscow', 'царицыно': 'moscow',
  'орехово': 'moscow', 'домодедовская': 'moscow', 'красногвардейская': 'moscow',
  'алма-атинская': 'moscow',
  // Арбатско-Покровская (3)
  'щёлковская': 'moscow', 'щелковская': 'moscow', 'первомайская': 'moscow',
  'измайловская': 'moscow', 'партизанская': 'moscow', 'семёновская': 'moscow',
  'семеновская': 'moscow', 'электрозаводская': 'moscow', 'бауманская': 'moscow',
  'площадь революции': 'moscow', 'смоленская': 'moscow',
  'славянский бульвар': 'moscow', 'кунцевская': 'moscow', 'молодёжная': 'moscow',
  'молодежная': 'moscow', 'крылатское': 'moscow', 'строгино': 'moscow',
  'мякинино': 'moscow', 'волоколамская': 'moscow', 'митино': 'moscow',
  'пятницкое шоссе': 'moscow',
  // Филёвская (4)
  'студенческая': 'moscow', 'кутузовская': 'moscow', 'фили': 'moscow',
  'багратионовская': 'moscow', 'филёвский парк': 'moscow', 'филевский парк': 'moscow',
  // Кольцевая (5)
  'краснопресненская': 'moscow', 'новослободская': 'moscow',
  'добрынинская': 'moscow', 'таганская': 'moscow',
  // Калужско-Рижская (6)
  'медведково': 'moscow', 'бабушкинская': 'moscow', 'свиблово': 'moscow',
  'ботанический сад': 'moscow', 'вднх': 'moscow', 'вднх метро': 'moscow',
  'алексеевская': 'moscow', 'рижская': 'moscow', 'сухаревская': 'moscow',
  'тургеневская': 'moscow', 'третьяковская': 'moscow',
  'шаболовская': 'moscow', 'шаболовской': 'moscow',
  'ленинский проспект': 'moscow', 'академическая': 'moscow',
  'профсоюзная': 'moscow', 'новые черёмушки': 'moscow', 'новые черемушки': 'moscow',
  'калужская': 'moscow', 'беляево': 'moscow', 'коньково': 'moscow',
  'тёплый стан': 'moscow', 'теплый стан': 'moscow',
  'ясенево': 'moscow', 'новоясеневская': 'moscow',
  // Таганско-Краснопресненская (7)
  'планерная': 'moscow', 'сходненская': 'moscow', 'тушинская': 'moscow',
  'спартак': 'moscow', 'щукинская': 'moscow', 'октябрьское поле': 'moscow',
  'полежаевская': 'moscow', 'улица 1905 года': 'moscow', 'баррикадная': 'moscow',
  'кузнецкий мост': 'moscow', 'выхино': 'moscow', 'рязанский проспект': 'moscow',
  'кузьминки': 'moscow', 'текстильщики': 'moscow', 'волгоградский проспект': 'moscow',
  'пролетарская': 'moscow', 'котельники': 'moscow', 'жулебино': 'moscow',
  'лермонтовский проспект': 'moscow',
  // Калининская (8)
  'новокосино': 'moscow', 'новогиреево': 'moscow', 'перово': 'moscow',
  'шоссе энтузиастов': 'moscow', 'авиамоторная': 'moscow',
  // Серпуховско-Тимирязевская (9)
  'алтуфьево': 'moscow', 'бибирево': 'moscow', 'отрадное': 'moscow',
  'владыкино': 'moscow', 'петровско-разумовская': 'moscow', 'тимирязевская': 'moscow',
  'дмитровская': 'moscow', 'савёловская': 'moscow', 'савеловская': 'moscow',
  'менделеевская': 'moscow', 'цветной бульвар': 'moscow', 'чеховская': 'moscow',
  'боровицкая': 'moscow', 'полянка': 'moscow', 'серпуховская': 'moscow',
  'тульская': 'moscow', 'нагатинская': 'moscow', 'нагорная': 'moscow',
  'нахимовский проспект': 'moscow', 'севастопольская': 'moscow',
  'чертановская': 'moscow', 'южная': 'moscow', 'пражская': 'moscow',
  'улица академика янгеля': 'moscow', 'аннино': 'moscow',
  'бульвар дмитрия донского': 'moscow',
  // Люблинско-Дмитровская (10)
  'марьина роща': 'moscow', 'трубная': 'moscow', 'сретенский бульвар': 'moscow',
  'чкаловская': 'moscow', 'римская': 'moscow', 'крестьянская застава': 'moscow',
  'дубровка': 'moscow', 'кожуховская': 'moscow', 'печатники': 'moscow',
  'волжская': 'moscow', 'люблино': 'moscow', 'братиславская': 'moscow',
  'марьино': 'moscow', 'борисово': 'moscow', 'шипиловская': 'moscow',
  'зябликово': 'moscow',
  // БКЛ + Солнцевская
  'деловой центр': 'moscow', 'выставочная': 'moscow',
  'хорошёвская': 'moscow', 'хорошевская': 'moscow', 'шелепиха': 'moscow',
  'петровский парк': 'moscow', 'минская': 'moscow', 'ломоносовский проспект': 'moscow',
  'раменки': 'moscow', 'мичуринский проспект': 'moscow', 'озёрная': 'moscow',
  'озерная': 'moscow', 'говорово': 'moscow', 'солнцево': 'moscow',
  'боровское шоссе': 'moscow', 'новопеределкино': 'moscow', 'рассказовка': 'moscow',
  'аминьевская': 'moscow', 'давыдково': 'moscow', 'мнёвники': 'moscow',
  'мневники': 'moscow', 'терехово': 'moscow', 'кунцевская бкл': 'moscow',
  'нагатинский затон': 'moscow', 'кленовый бульвар': 'moscow',
  // Некрасовская
  'нижегородская': 'moscow', 'стахановская': 'moscow', 'юго-восточная': 'moscow',
  'окская': 'moscow', 'улица дмитриевского': 'moscow', 'лухмановская': 'moscow',
  'некрасовка': 'moscow', 'косино': 'moscow',

  // ─── Санкт-Петербург (уникальные станции) ───
  // Кировско-Выборгская (1)
  'девяткино': 'spb', 'гражданский проспект': 'spb', 'политехническая': 'spb',
  'площадь мужества': 'spb', 'лесная': 'spb', 'выборгская': 'spb',
  'площадь ленина': 'spb', 'чернышевская': 'spb', 'площадь восстания': 'spb',
  'владимирская': 'spb', 'технологический институт': 'spb', 'нарвская': 'spb',
  'кировский завод': 'spb', 'автово': 'spb', 'проспект ветеранов': 'spb',
  // Московско-Петроградская (2)
  'парнас': 'spb', 'проспект просвещения': 'spb', 'озерки': 'spb', 'удельная': 'spb',
  'чёрная речка': 'spb', 'черная речка': 'spb', 'петроградская': 'spb',
  'горьковская': 'spb', 'невский проспект': 'spb', 'сенная площадь': 'spb',
  'московские ворота': 'spb', 'электросила': 'spb', 'московская': 'spb',
  'звёздная': 'spb', 'звездная': 'spb', 'купчино': 'spb',
  // Невско-Василеостровская (3)
  'беговая спб': 'spb', 'новокрестовская': 'spb', 'зенит': 'spb',
  'приморская': 'spb', 'василеостровская': 'spb', 'гостиный двор': 'spb',
  'площадь александра невского': 'spb', 'елизаровская': 'spb',
  'ломоносовская': 'spb', 'обухово': 'spb', 'рыбацкое': 'spb',
  // Правобережная (4)
  'комендантский проспект': 'spb', 'старая деревня': 'spb', 'крестовский остров': 'spb',
  'спасская': 'spb', 'достоевская': 'spb', 'лиговский проспект': 'spb',
  'новочеркасская': 'spb', 'ладожская': 'spb', 'проспект большевиков': 'spb',
  'улица дыбенко': 'spb',
  // Фрунзенско-Приморская (5)
  'адмиралтейская': 'spb', 'садовая': 'spb', 'звенигородская': 'spb',
  'пушкинская спб': 'spb', 'обводный канал': 'spb', 'волковская': 'spb',
  'бухарестская': 'spb', 'международная спб': 'spb', 'проспект славы': 'spb',
  'дунайская': 'spb', 'шушары': 'spb',
};

// Канонические city.slug из БД (cities.seed.ts) — единственный источник правды
export const CITY_SLUGS_SET = new Set([
  'moscow', 'spb', 'kazan', 'ekb', 'novosibirsk', 'sochi', 'krasnodar',
  'nnov', 'samara', 'ufa', 'rostov', 'voronezh', 'krasnoyarsk',
]);

// Алиасы → канонический slug. Используется чтобы старые/чужие варианты слугов
// (например в localStorage у юзеров) приводить к актуальным значениям из БД.
const CITY_SLUG_ALIASES: Record<string, string> = {
  'saint-petersburg': 'spb',
  'sankt-peterburg': 'spb',
  'saint_petersburg': 'spb',
  'st-petersburg': 'spb',
  'piter': 'spb',
  'spb': 'spb',
  'yekaterinburg': 'ekb',
  'ekaterinburg': 'ekb',
  'ekb': 'ekb',
  'nizhny-novgorod': 'nnov',
  'nizhniy-novgorod': 'nnov',
  'nizhniynovgorod': 'nnov',
  'nnov': 'nnov',
  'rostov-na-donu': 'rostov',
  'rostov': 'rostov',
};

/**
 * Привести входящий city slug к канонической форме из БД.
 * Возвращает undefined если slug не похож ни на один известный город — это значит
 * лучше совсем не применять фильтр, чем применить заведомо нерабочий.
 */
export function normalizeCitySlug(slug: string | undefined | null): string | undefined {
  if (!slug) return undefined;
  const s = slug.toLowerCase().trim();
  if (CITY_SLUGS_SET.has(s)) return s;
  if (CITY_SLUG_ALIASES[s]) return CITY_SLUG_ALIASES[s];
  return undefined;
}

const CUISINE_MAP: Record<string, string> = {
  'итальян': 'italian', 'пицц': 'italian', 'пасту': 'italian', 'паста': 'italian', 'ризотто': 'italian', 'карбонар': 'italian', 'спагетти': 'italian', 'лазань': 'italian', 'равиоли': 'italian', 'пенне': 'italian', 'феттучин': 'italian', 'болоньез': 'italian', 'тальятел': 'italian',
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
  'спагетти': 'спагетти', 'лазань': 'лазанья', 'равиоли': 'равиоли', 'пенне': 'пенне', 'феттучин': 'феттучини', 'болоньез': 'болоньезе', 'тальятел': 'тальятелле',
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
  // Напитки
  'пиво': 'пиво', 'пива': 'пиво', 'пивк': 'пиво', 'пивн': 'пиво',
  'коктейл': 'коктейль', 'мохито': 'мохито', 'маргарит': 'маргарита',
  'виски': 'виски', 'вино': 'вино', 'вина': 'вино', 'шампанск': 'шампанское', 'просекко': 'просекко',
  'кофе': 'кофе', 'капучин': 'капучино', 'латте': 'латте', 'эспрессо': 'эспрессо', 'американо': 'американо',
  'чай': 'чай', 'чаю': 'чай', 'чаёк': 'чай', 'чаек': 'чай', 'матч': 'матча', 'пуэр': 'пуэр',
  'лимонад': 'лимонад', 'смузи': 'смузи', 'фреш': 'фреш',
  'глинтвейн': 'глинтвейн', 'сидр': 'сидр', 'эль': 'эль',
  // Абстрактные понятия → конкретные блюда
  'сладк': 'сладкое', 'сладенького': 'сладкое', 'сладеньк': 'сладкое',
  'выпить': 'выпить', 'напиться': 'выпить', 'алкогол': 'выпить', 'бухн': 'выпить',
  'мясо': 'мясо', 'мясн': 'мясо',
  'рыб': 'рыба', 'рыбк': 'рыба',
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
  'паста': ['спагетти', 'карбонара', 'болоньезе', 'лазанья', 'пенне', 'феттучини', 'тальятелле', 'равиоли'],
  'спагетти': ['паста', 'карбонара', 'болоньезе', 'лазанья', 'пенне', 'феттучини', 'тальятелле'],
  'лазанья': ['паста', 'спагетти', 'карбонара', 'болоньезе', 'равиоли'],
  'равиоли': ['паста', 'спагетти', 'лазанья', 'тортеллини'],
  'болоньезе': ['паста', 'спагетти', 'лазанья', 'тальятелле'],
  'карбонара': ['паста', 'спагетти', 'пенне', 'феттучини'],
  'салат': ['цезарь', 'оливье', 'греческий', 'микс'],
  'завтрак': ['каша', 'сырники', 'блины', 'омлет', 'яичница', 'круассан', 'тост', 'бенедикт'],
  // Напитки
  'пиво': ['эль', 'лагер', 'крафт', 'стаут', 'пилзнер', 'нефильтрованн', 'сидр'],
  'вино': ['просекко', 'шампанское', 'кьянти', 'мерло', 'каберне', 'пино'],
  'коктейль': ['мохито', 'маргарита', 'негрони', 'аперол', 'дайкири', 'космополитен', 'виски'],
  'кофе': ['капучино', 'латте', 'эспрессо', 'американо', 'раф', 'флэт-уайт'],
  'чай': ['чайник', 'травяной', 'зелёный чай', 'зеленый чай', 'иван-чай', 'имбирный', 'гречишный', 'матча', 'пуэр', 'улун', 'жасминовый', 'ягодный чай', 'брусничный', 'облепиховый', 'авторский чай'],
  // Семантические (абстрактное → конкретное)
  'сладкое': ['десерт', 'торт', 'тирамису', 'чизкейк', 'мороженое', 'брауни', 'эклер', 'панна-котт', 'медовик'],
  'выпить': ['пиво', 'вино', 'коктейль', 'виски', 'эль', 'сидр'],
  'мясо': ['стейк', 'рибай', 'шашлык', 'бургер', 'кебаб', 'отбивн', 'каре', 'медальон'],
  'рыба': ['лосось', 'форель', 'сибас', 'дорада', 'тунец', 'судак', 'окунь'],
};

const DIETARY_MAP: Record<string, string> = {
  'веган': 'vegan', 'веганск': 'vegan',
  'вегетариан': 'vegetarian', 'растительн': 'vegetarian',
  'без глютен': 'gluten-free', 'безглютен': 'gluten-free',
  'без лактоз': 'lactose-free', 'безлактоз': 'lactose-free',
  'без молок': 'lactose-free', 'безмолочн': 'lactose-free',
  'халяль': 'halal', 'халял': 'halal',
  'кошер': 'kosher',
  'зож': 'healthy', 'кбжу': 'healthy', 'правильное питани': 'healthy', 'пп меню': 'healthy', 'пп-меню': 'healthy', 'пп питан': 'healthy', 'пп рецепт': 'healthy', 'диетическ': 'healthy',
  'без орехов': 'nut-free', 'без арахис': 'nut-free',
  'детское меню': 'kids-menu', 'детским меню': 'kids-menu',
};

const OCCASION_MAP: Record<string, string> = {
  'свидани': 'romantic-dinner', 'романтическ': 'romantic-dinner', 'романтик': 'romantic-dinner', 'романтичн': 'romantic-dinner',
  'пригласить': 'romantic-dinner', 'позвать': 'romantic-dinner',
  'день рожден': 'banquet', 'юбилей': 'banquet', 'днюху': 'banquet',
  'деловой': 'business-meeting', 'деловая встреч': 'business-meeting', 'деловую': 'business-meeting',
  'бизнес-ланч': 'business-lunch', 'бизнес ланч': 'business-lunch',
  'с друзьями': 'with-friends', 'компани': 'with-friends', 'дружеск': 'with-friends', 'друзьями': 'with-friends',
  'с детьми': 'family', 'детьми': 'family', 'ребёнк': 'family', 'ребенк': 'family', 'семейн': 'family', 'семьёй': 'family', 'семьей': 'family',
  'банкет': 'banquet', 'корпоратив': 'banquet', 'свадьб': 'banquet',
  'выпускн': 'banquet',
  'завтрак': 'breakfast-brunch', 'бранч': 'breakfast-brunch',
  'поздн': 'late-dinner', 'ночью поесть': 'late-dinner',
  'быстро поесть': 'quick-bite', 'быстро перекус': 'quick-bite',
  'большой компани': 'large-group', 'большая компани': 'large-group',
};

const ATMOSPHERE_MAP: Record<string, string> = {
  'уютн': 'quiet', 'камерн': 'quiet', 'ламповый': 'quiet',
  'террас': 'terrace', 'открытая': 'terrace', 'летник': 'terrace', 'веранд': 'terrace',
  'с видом': 'panorama', 'панорам': 'panorama', 'панорамн': 'panorama', 'видом на': 'panorama',
  'крыш': 'panorama', 'руфтоп': 'panorama', 'крыше': 'panorama',
  'живая музык': 'live-music', 'живой музык': 'live-music', 'концерт': 'live-music',
  'тихий': 'quiet', 'тихо': 'quiet', 'спокойн': 'quiet',
  'с животн': 'pet-friendly', 'с собак': 'pet-friendly', 'с питомц': 'pet-friendly',
  'парковк': 'parking', 'припарковать': 'parking',
  'детская комнат': 'kids-room', 'игровая комнат': 'kids-room',
  'wifi': 'wifi', 'вай-фай': 'wifi', 'вайфай': 'wifi', 'розетк': 'wifi',
};

const VENUE_MAP: Record<string, string> = {
  'ресторан': 'restaurant',
  'кафе': 'cafe',
  'бар': 'bar', 'баре': 'bar', 'бару': 'bar', 'барчик': 'bar',
  'кофейн': 'coffeehouse', 'чайн': 'teahouse', 'чайхан': 'teahouse',
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
    return metroMatch[1].toLowerCase().trim();
  }
}

/**
 * Найти город по названию станции метро (или производному, типа "шаболовской").
 * Возвращает city slug ('moscow' / 'spb' / ...) или undefined.
 * Делает простое стеммирование окончаний: "шаболовской"→"шаболовская".
 */
function metroToCity(metroName: string): string | undefined {
  const m = metroName.toLowerCase().trim();
  if (METRO_TO_CITY[m]) return METRO_TO_CITY[m];
  // Поиск по подстрочному совпадению — например "на шаболовской" уже как ключ есть,
  // но окончания типа "ой/ом/ке" проверим стеммингом
  for (const [key, city] of Object.entries(METRO_TO_CITY)) {
    if (m === key || m.startsWith(key) || key.startsWith(m.slice(0, Math.max(m.length - 3, 4)))) {
      return city;
    }
  }
}

/**
 * Extract all potential location words from query for DB-level metro_station search.
 * Returns original Russian text (not slugified) so ILIKE can match against metro_station column.
 */
export function extractLocationWords(query: string): string[] {
  const q = query.toLowerCase();
  const words: string[] = [];

  // Check LOCATION_MAP first
  for (const key of Object.keys(LOCATION_MAP)) {
    if (q.includes(key)) {
      words.push(key);
    }
  }

  // Extract "метро X" pattern
  const metroMatch = q.match(/(?:метро|м\.)\s+([а-яё\-]+(?:\s+[а-яё\-]+)?)/i);
  if (metroMatch) words.push(metroMatch[1]);

  // Extract "на X" where X looks like a place name (capitalized in original or known pattern)
  const onMatch = query.match(/(?:на|возле|около|рядом с|у)\s+([А-ЯЁ][а-яё\-]+(?:[\s-][А-ЯЁа-яё\-]+)*)/);
  if (onMatch) words.push(onMatch[1].toLowerCase());

  return [...new Set(words)];
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

  // Location: try metro first, then cities, then metro→city map, then districts, then fuzzy phrase
  const q = query.toLowerCase();

  // 1) Явное "метро X" / "м. X" — название станции
  const metro = extractMetro(query);
  if (metro) {
    const cityFromMetro = metroToCity(metro);
    if (cityFromMetro) {
      // Знаем город — фильтруем по городу + уточняем по станции
      params.location = cityFromMetro;
      params.rawLocation = metro;
    } else {
      // Не знаем город — оставляем только название для ILIKE поиска
      params.rawLocation = metro;
    }
    hits++;
  } else {
    let matchedKey: string | undefined;
    let matchedSlug: string | undefined;
    // 2) Сначала ищем явные города (Москва, СПб и т.д.)
    for (const [key, value] of Object.entries(LOCATION_MAP)) {
      if (q.includes(key) && CITY_SLUGS_SET.has(value)) {
        matchedKey = key; matchedSlug = value; break;
      }
    }
    // 3) Если города нет — ищем станцию метро через METRO_TO_CITY
    if (!matchedSlug) {
      for (const [key, city] of Object.entries(METRO_TO_CITY)) {
        if (q.includes(key)) {
          params.location = city;
          params.rawLocation = key;
          hits++;
          matchedSlug = city; // помечаем что нашли — пропускаем следующий шаг
          break;
        }
      }
    }
    // 4) Если ни города, ни метро — ищем район (Арбат, Патрики и т.п.)
    if (!matchedSlug) {
      for (const [key, value] of Object.entries(LOCATION_MAP)) {
        if (q.includes(key)) { matchedKey = key; matchedSlug = value; break; }
      }
      if (matchedSlug && matchedKey) {
        params.location = matchedSlug;
        params.rawLocation = matchedKey;
        hits++;
      }
    } else if (matchedKey && !params.location) {
      // Город найден напрямую (шаг 2)
      params.location = matchedSlug;
      params.rawLocation = matchedKey;
      hits++;
    }
    // 5) Фолбэк: фразы типа "на преображенской площади"
    if (!params.location && !params.rawLocation) {
      const phrase = extractLocationPhrase(query);
      if (phrase) {
        // Возможно эта фраза — стеммированная станция метро ("шаболовской"→"шаболовская")
        const cityFromPhrase = metroToCity(phrase);
        if (cityFromPhrase) params.location = cityFromPhrase;
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
