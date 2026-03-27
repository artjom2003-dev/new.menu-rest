/**
 * Gastro Profile — Quiz questions & archetypes
 *
 * 12 taste axes (each 0-10):
 *   price_tolerance, adventure, intensity, texture_pref, protein_focus,
 *   social_context, meal_tempo, visual_weight, alcohol_profile,
 *   sweet_tooth, health_vector, foodie_level
 */

export type TasteAxis =
  | 'price_tolerance'
  | 'adventure'
  | 'intensity'
  | 'texture_pref'
  | 'protein_focus'
  | 'social_context'
  | 'meal_tempo'
  | 'visual_weight'
  | 'alcohol_profile'
  | 'sweet_tooth'
  | 'health_vector'
  | 'foodie_level';

export const ALL_AXES: TasteAxis[] = [
  'price_tolerance', 'adventure', 'intensity', 'texture_pref', 'protein_focus',
  'social_context', 'meal_tempo', 'visual_weight', 'alcohol_profile',
  'sweet_tooth', 'health_vector', 'foodie_level',
];

export interface QuizOption {
  label: string;
  axisContributions: Partial<Record<TasteAxis, number>>;
  dietary?: string;
}

export interface QuizQuestion {
  id: number;
  text: string;
  emoji: string;
  multiSelect: boolean;
  options: QuizOption[];
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    text: 'Вы в новом городе — куда идёте ужинать?',
    emoji: '🌍',
    multiSelect: false,
    options: [
      { label: 'Гуглю лучший ресторан с высоким рейтингом', axisContributions: { foodie_level: 2, visual_weight: 1 } },
      { label: 'Спрашиваю у местных про скрытую жемчужину', axisContributions: { adventure: 3, foodie_level: 1 } },
      { label: 'Захожу в первое попавшееся уютное место', axisContributions: { adventure: 1, social_context: 1 } },
      { label: 'Ищу стритфуд на рынке', axisContributions: { adventure: 2, price_tolerance: -1, intensity: 1 } },
    ],
  },
  {
    id: 2,
    text: 'Сколько вы готовы потратить на ужин на двоих?',
    emoji: '💰',
    multiSelect: false,
    options: [
      { label: 'До 1500 ₽ — главное вкусно', axisContributions: { price_tolerance: 1 } },
      { label: '1500–3000 ₽ — золотая середина', axisContributions: { price_tolerance: 3 } },
      { label: '3000–6000 ₽ — люблю хорошие рестораны', axisContributions: { price_tolerance: 5, foodie_level: 1 } },
      { label: 'Не считаю — важен опыт', axisContributions: { price_tolerance: 8, foodie_level: 2, visual_weight: 1 } },
    ],
  },
  {
    id: 3,
    text: 'Идеальный десерт — это...',
    emoji: '🍰',
    multiSelect: false,
    options: [
      { label: 'Шоколадный фондан с мороженым', axisContributions: { sweet_tooth: 3, intensity: 2 } },
      { label: 'Лёгкий чизкейк или панна-котта', axisContributions: { sweet_tooth: 2, texture_pref: 1 } },
      { label: 'Фруктовый сорбет или ягоды', axisContributions: { sweet_tooth: 1, health_vector: 2 } },
      { label: 'Не люблю десерты — лучше сырная тарелка', axisContributions: { sweet_tooth: -1, protein_focus: 1, alcohol_profile: 1 } },
    ],
  },
  {
    id: 4,
    text: 'Что важнее в ресторане?',
    emoji: '✨',
    multiSelect: false,
    options: [
      { label: 'Красивая подача и атмосфера', axisContributions: { visual_weight: 3, social_context: 1 } },
      { label: 'Огромные порции и сытность', axisContributions: { visual_weight: -1, intensity: 2, protein_focus: 1 } },
      { label: 'Уникальные вкусовые сочетания', axisContributions: { foodie_level: 3, adventure: 1 } },
      { label: 'Скорость подачи и удобство', axisContributions: { meal_tempo: 3 } },
    ],
  },
  {
    id: 5,
    text: 'Ваш идеальный обед с друзьями:',
    emoji: '👫',
    multiSelect: false,
    options: [
      { label: 'Шумный бар с закусками и пивом', axisContributions: { social_context: 3, alcohol_profile: 2, meal_tempo: 1 } },
      { label: 'Уютный ресторан с дегустационным меню', axisContributions: { social_context: 2, foodie_level: 2, price_tolerance: 2 } },
      { label: 'Пикник в парке с домашней едой', axisContributions: { social_context: 1, health_vector: 1, price_tolerance: -1 } },
      { label: 'Кулинарный мастер-класс вместе', axisContributions: { social_context: 2, adventure: 2, foodie_level: 1 } },
    ],
  },
  {
    id: 6,
    text: 'Как вы относитесь к острой еде?',
    emoji: '🌶️',
    multiSelect: false,
    options: [
      { label: 'Чем острее — тем лучше!', axisContributions: { intensity: 3, adventure: 1 } },
      { label: 'Люблю умеренную остроту', axisContributions: { intensity: 2 } },
      { label: 'Только лёгкая пикантность', axisContributions: { intensity: 1 } },
      { label: 'Избегаю острого', axisContributions: { intensity: -1 } },
    ],
  },
  {
    id: 7,
    text: 'Какой белок вы предпочитаете?',
    emoji: '🥩',
    multiSelect: true,
    options: [
      { label: 'Мясо — стейк, бургер, шашлык', axisContributions: { protein_focus: 3 } },
      { label: 'Рыба и морепродукты', axisContributions: { protein_focus: 2, health_vector: 1 } },
      { label: 'Птица — курица, утка, индейка', axisContributions: { protein_focus: 2 } },
      { label: 'Растительный — тофу, бобовые, грибы', axisContributions: { protein_focus: 1, health_vector: 2 }, dietary: 'vegetarian' },
      { label: 'Не важно — ем всё', axisContributions: { adventure: 1 } },
    ],
  },
  {
    id: 8,
    text: 'Ваше отношение к алкоголю за ужином:',
    emoji: '🍷',
    multiSelect: false,
    options: [
      { label: 'Обожаю подбирать вино к блюдам', axisContributions: { alcohol_profile: 3, foodie_level: 2 } },
      { label: 'Бокал вина или коктейль — в самый раз', axisContributions: { alcohol_profile: 2, social_context: 1 } },
      { label: 'Только крафтовое пиво или сидр', axisContributions: { alcohol_profile: 2, adventure: 1 } },
      { label: 'Предпочитаю безалкогольное', axisContributions: { alcohol_profile: -1, health_vector: 1 } },
    ],
  },
  {
    id: 9,
    text: 'Какая текстура вам нравится больше?',
    emoji: '🤌',
    multiSelect: false,
    options: [
      { label: 'Хрустящая — корочка, темпура, чипсы', axisContributions: { texture_pref: 3 } },
      { label: 'Кремовая — ризотто, пюре, суп-крем', axisContributions: { texture_pref: 1, intensity: -1 } },
      { label: 'Тягучая — сыр, моцарелла, фондю', axisContributions: { texture_pref: 2, sweet_tooth: 1 } },
      { label: 'Сочная — томлёное мясо, рагу', axisContributions: { texture_pref: 2, protein_focus: 1, intensity: 1 } },
    ],
  },
  {
    id: 10,
    text: 'Утро начинается с...',
    emoji: '☀️',
    multiSelect: false,
    options: [
      { label: 'Полный английский завтрак', axisContributions: { protein_focus: 2, intensity: 1, meal_tempo: -1 } },
      { label: 'Авокадо-тост и смузи', axisContributions: { health_vector: 3, visual_weight: 1 } },
      { label: 'Круассан и капучино', axisContributions: { sweet_tooth: 1, visual_weight: 1, meal_tempo: 2 } },
      { label: 'Каша или гранола с фруктами', axisContributions: { health_vector: 2, meal_tempo: 1 } },
      { label: 'Пропускаю завтрак', axisContributions: { meal_tempo: 3 } },
    ],
  },
  {
    id: 11,
    text: 'Какую кухню хотите попробовать первой?',
    emoji: '🗺️',
    multiSelect: false,
    options: [
      { label: 'Перуанская или мексиканская', axisContributions: { adventure: 3, intensity: 1 } },
      { label: 'Японская омакасе', axisContributions: { adventure: 2, foodie_level: 3, price_tolerance: 2 } },
      { label: 'Скандинавская — новая нордическая', axisContributions: { adventure: 2, visual_weight: 2, health_vector: 1 } },
      { label: 'Грузинская или узбекская — проверенная классика', axisContributions: { adventure: -1, intensity: 1, protein_focus: 1 } },
    ],
  },
  {
    id: 12,
    text: 'Как быстро вы хотите получить еду?',
    emoji: '⏱️',
    multiSelect: false,
    options: [
      { label: '5 минут — фастфуд или перекус', axisContributions: { meal_tempo: 3, price_tolerance: -1 } },
      { label: '15–20 минут — обычный ресторан', axisContributions: { meal_tempo: 2 } },
      { label: 'Не тороплюсь — наслаждаюсь процессом', axisContributions: { meal_tempo: -1, social_context: 1, foodie_level: 1 } },
      { label: 'Готов ждать час ради шедевра', axisContributions: { meal_tempo: -2, foodie_level: 3, visual_weight: 1 } },
    ],
  },
  {
    id: 13,
    text: 'Есть ли у вас пищевые ограничения?',
    emoji: '🚫',
    multiSelect: true,
    options: [
      { label: 'Нет ограничений', axisContributions: {} },
      { label: 'Вегетарианец', axisContributions: { health_vector: 1 }, dietary: 'vegetarian' },
      { label: 'Веган', axisContributions: { health_vector: 2 }, dietary: 'vegan' },
      { label: 'Безглютеновая диета', axisContributions: { health_vector: 1 }, dietary: 'gluten_free' },
      { label: 'Безлактозная диета', axisContributions: { health_vector: 1 }, dietary: 'lactose_free' },
      { label: 'Халяль', axisContributions: {}, dietary: 'halal' },
      { label: 'Кошерное', axisContributions: {}, dietary: 'kosher' },
    ],
  },
  {
    id: 14,
    text: 'Вечер пятницы — что заказываете?',
    emoji: '🎉',
    multiSelect: false,
    options: [
      { label: 'Большую пиццу и вино', axisContributions: { social_context: 2, alcohol_profile: 1, meal_tempo: 1 } },
      { label: 'Сет роллов с саке', axisContributions: { adventure: 1, alcohol_profile: 1, visual_weight: 1 } },
      { label: 'Стейк с гарниром и красное вино', axisContributions: { protein_focus: 2, alcohol_profile: 2, price_tolerance: 2 } },
      { label: 'Тапас-бар — много маленьких блюд', axisContributions: { adventure: 2, social_context: 2, foodie_level: 1 } },
    ],
  },
  {
    id: 15,
    text: 'Если бы вы были блюдом, то каким?',
    emoji: '🪞',
    multiSelect: false,
    options: [
      { label: 'Тирамису — многослойный и сложный', axisContributions: { sweet_tooth: 2, foodie_level: 2, texture_pref: 1 } },
      { label: 'Том Ям — яркий и запоминающийся', axisContributions: { intensity: 3, adventure: 2 } },
      { label: 'Боул с лососем — сбалансированный и свежий', axisContributions: { health_vector: 3, visual_weight: 1 } },
      { label: 'Бургер — честный и без понтов', axisContributions: { meal_tempo: 2, protein_focus: 1, price_tolerance: -1 } },
      { label: 'Дегустационный сет — весь мир на тарелке', axisContributions: { foodie_level: 3, adventure: 2, price_tolerance: 3 } },
    ],
  },
];

/* ──────────── Archetypes ──────────── */

export interface Archetype {
  key: string;
  name: string;
  emoji: string;
  description: string;
  dominantAxes: TasteAxis[];
}

export const ARCHETYPES: Archetype[] = [
  {
    key: 'adventurer',
    name: 'Авантюрист',
    emoji: '🧭',
    description: 'Вы открыты ко всему новому — необычные кухни, странные сочетания, уличная еда в незнакомом городе. Скука — ваш главный враг.',
    dominantAxes: ['adventure', 'intensity', 'foodie_level'],
  },
  {
    key: 'perfectionist',
    name: 'Гурман-Перфекционист',
    emoji: '🎩',
    description: 'Каждый ужин — событие. Вы цените безупречную подачу, сложные вкусы и авторскую кухню. Michelin — ваш путеводитель.',
    dominantAxes: ['foodie_level', 'visual_weight', 'price_tolerance'],
  },
  {
    key: 'health_nut',
    name: 'ЗОЖник',
    emoji: '🥗',
    description: 'Баланс, свежесть и польза — ваши ориентиры. Вы знаете КБЖУ любимых блюд и выбираете осознанно.',
    dominantAxes: ['health_vector', 'meal_tempo', 'texture_pref'],
  },
  {
    key: 'sweet_lover',
    name: 'Сладкоежка',
    emoji: '🧁',
    description: 'Десерт — это не завершение ужина, а его главная цель. Кондитерские и пекарни — ваша вторая гостиная.',
    dominantAxes: ['sweet_tooth', 'visual_weight', 'texture_pref'],
  },
  {
    key: 'hedonist',
    name: 'Гедонист',
    emoji: '🥂',
    description: 'Еда — это удовольствие. Вы любите щедрые порции, насыщенные вкусы и не отказываете себе ни в чём.',
    dominantAxes: ['intensity', 'protein_focus', 'alcohol_profile'],
  },
  {
    key: 'sommelier',
    name: 'Сомелье',
    emoji: '🍷',
    description: 'Вино и еда — неразлучная пара. Вы подбираете напиток к блюду и знаете, чем Пино Нуар отличается от Неббиоло.',
    dominantAxes: ['alcohol_profile', 'foodie_level', 'price_tolerance'],
  },
  {
    key: 'universal',
    name: 'Универсал',
    emoji: '🌈',
    description: 'Вы не впадаете в крайности — любите разное и в разных ситуациях. Гибкость — ваша суперсила.',
    dominantAxes: ['social_context', 'adventure', 'meal_tempo'],
  },
  {
    key: 'carnivore',
    name: 'Мясоед',
    emoji: '🥩',
    description: 'Стейк — это не просто еда, это философия. Вы разбираетесь в прожарках и знаете, чем рибай отличается от филе-миньона.',
    dominantAxes: ['protein_focus', 'intensity', 'price_tolerance'],
  },
  {
    key: 'minimalist',
    name: 'Минималист',
    emoji: '🍚',
    description: 'Простота — высшая форма изысканности. Вам нравятся понятные блюда из качественных продуктов без лишних сложностей.',
    dominantAxes: ['meal_tempo', 'health_vector', 'texture_pref'],
  },
];
