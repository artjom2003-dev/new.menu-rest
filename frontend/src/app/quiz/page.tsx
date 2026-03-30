'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/stores/auth.store';
import { useGastroStore, type GastroProfile } from '@/stores/gastro.store';
import { gastroApi } from '@/lib/api';
import RadarChart from '@/components/gastro/RadarChart';

/* ═══════════════════════════════════════════════════════════
   Quiz questions (client-side fallback if API unavailable)
   ═══════════════════════════════════════════════════════════ */
interface QuizOption {
  id: number;
  text: string;
  emoji: string;
}

interface QuizQuestion {
  id: number;
  emoji: string;
  text: string;
  options: QuizOption[];
  multi?: boolean;
}

const FALLBACK_QUESTIONS: QuizQuestion[] = [
  {
    id: 0, emoji: '🌶️', text: 'Как вы относитесь к острой еде?',
    options: [
      { id: 0, text: 'Обожаю — чем острее, тем лучше', emoji: '🔥' },
      { id: 1, text: 'Люблю умеренную остроту', emoji: '🌶️' },
      { id: 2, text: 'Только совсем лёгкую', emoji: '😌' },
      { id: 3, text: 'Не переношу острое', emoji: '🚫' },
    ],
  },
  {
    id: 1, emoji: '🍰', text: 'Ваше отношение к десертам?',
    options: [
      { id: 0, text: 'Жизнь без сладкого — не жизнь', emoji: '🍫' },
      { id: 1, text: 'Люблю, но в меру', emoji: '🍰' },
      { id: 2, text: 'Предпочитаю фрукты', emoji: '🍓' },
      { id: 3, text: 'Почти не ем сладкое', emoji: '🥗' },
    ],
  },
  {
    id: 2, emoji: '🌍', text: 'Готовы ли вы пробовать экзотическую кухню?',
    options: [
      { id: 0, text: 'Да! Чем необычнее, тем интереснее', emoji: '🐙' },
      { id: 1, text: 'Иногда, если выглядит аппетитно', emoji: '🤔' },
      { id: 2, text: 'Предпочитаю знакомые блюда', emoji: '🏠' },
      { id: 3, text: 'Только проверенная классика', emoji: '👨‍🍳' },
    ],
  },
  {
    id: 3, emoji: '🥩', text: 'Какой белок вы предпочитаете?',
    options: [
      { id: 0, text: 'Красное мясо — стейк, бургеры', emoji: '🥩' },
      { id: 1, text: 'Птица и рыба', emoji: '🐟' },
      { id: 2, text: 'Морепродукты', emoji: '🦐' },
      { id: 3, text: 'Растительный белок / вегетарианство', emoji: '🌱' },
    ],
  },
  {
    id: 4, emoji: '🍳', text: 'Идеальный завтрак — это...',
    options: [
      { id: 0, text: 'Яичница, бекон, тосты', emoji: '🍳' },
      { id: 1, text: 'Каша, йогурт, гранола', emoji: '🥣' },
      { id: 2, text: 'Круассан и кофе', emoji: '🥐' },
      { id: 3, text: 'Суп, рис — полноценный обед', emoji: '🍲' },
      { id: 4, text: 'Я не завтракаю', emoji: '😴' },
    ],
  },
  {
    id: 5, emoji: '🍷', text: 'Ваш любимый тип напитков к еде?',
    options: [
      { id: 0, text: 'Вино', emoji: '🍷' },
      { id: 1, text: 'Пиво или сидр', emoji: '🍺' },
      { id: 2, text: 'Коктейли', emoji: '🍹' },
      { id: 3, text: 'Чай или кофе', emoji: '☕' },
      { id: 4, text: 'Просто вода / без алкоголя', emoji: '💧' },
    ],
  },
  {
    id: 6, emoji: '🧀', text: 'Как вы относитесь к сыру?',
    options: [
      { id: 0, text: 'Люблю все виды — от бри до горгонзолы', emoji: '🧀' },
      { id: 1, text: 'Только мягкие и молодые', emoji: '🤍' },
      { id: 2, text: 'Нравится, но не фанат', emoji: '😊' },
      { id: 3, text: 'Не ем сыр', emoji: '🚫' },
    ],
  },
  {
    id: 7, emoji: '🔪', text: 'Что важнее в блюде?',
    options: [
      { id: 0, text: 'Насыщенный сложный вкус', emoji: '🎭' },
      { id: 1, text: 'Свежесть и лёгкость', emoji: '🌿' },
      { id: 2, text: 'Текстура и подача', emoji: '✨' },
      { id: 3, text: 'Размер порции и сытность', emoji: '💪' },
    ],
  },
  {
    id: 8, emoji: '🌮', text: 'Любимая кухня мира?',
    options: [
      { id: 0, text: 'Итальянская', emoji: '🇮🇹' },
      { id: 1, text: 'Японская / Азиатская', emoji: '🇯🇵' },
      { id: 2, text: 'Грузинская / Кавказская', emoji: '🇬🇪' },
      { id: 3, text: 'Мексиканская / Латино', emoji: '🇲🇽' },
      { id: 4, text: 'Русская / Европейская', emoji: '🇷🇺' },
    ],
  },
  {
    id: 9, emoji: '🥑', text: 'Следите ли вы за здоровьем питания?',
    options: [
      { id: 0, text: 'Строго — считаю калории и БЖУ', emoji: '📊' },
      { id: 1, text: 'Стараюсь есть сбалансированно', emoji: '⚖️' },
      { id: 2, text: 'Иногда, но не заморачиваюсь', emoji: '🤷' },
      { id: 3, text: 'Ем что хочу и радуюсь жизни', emoji: '🎉' },
    ],
  },
  {
    id: 10, emoji: '🍕', text: 'Пицца или суши?',
    options: [
      { id: 0, text: 'Пицца однозначно!', emoji: '🍕' },
      { id: 1, text: 'Суши и роллы', emoji: '🍣' },
      { id: 2, text: 'Зависит от настроения', emoji: '🤔' },
      { id: 3, text: 'Ни то, ни другое', emoji: '😅' },
    ],
  },
  {
    id: 11, emoji: '🍜', text: 'Суп — это...',
    options: [
      { id: 0, text: 'Обязательная часть обеда', emoji: '🍲' },
      { id: 1, text: 'Люблю, но не каждый день', emoji: '🥄' },
      { id: 2, text: 'Только крем-супы', emoji: '🥣' },
      { id: 3, text: 'Редко ем супы', emoji: '🙅' },
    ],
  },
  {
    id: 12, emoji: '🎉', text: 'Идеальный ужин в ресторане:',
    options: [
      { id: 0, text: 'Дегустация из 7 блюд', emoji: '🍽️' },
      { id: 1, text: 'Одно фирменное блюдо + десерт', emoji: '⭐' },
      { id: 2, text: 'Гриль и мясо на компанию', emoji: '🥩' },
      { id: 3, text: 'Лёгкий салат и бокал вина', emoji: '🥗' },
    ],
  },
  {
    id: 13, emoji: '⏰', text: 'Ваш подход к еде в целом:',
    options: [
      { id: 0, text: 'Еда — это искусство и удовольствие', emoji: '🎨' },
      { id: 1, text: 'Еда — это топливо, главное полезно', emoji: '⛽' },
      { id: 2, text: 'Еда — это повод собраться с друзьями', emoji: '👨‍👩‍👧‍👦' },
      { id: 3, text: 'Еда — это комфорт и уют', emoji: '🏡' },
    ],
  },
  {
    id: 14, emoji: '🌟', text: 'Если бы вы открыли ресторан, это был бы:',
    options: [
      { id: 0, text: 'Авторский fine-dining', emoji: '💎' },
      { id: 1, text: 'Уютное кафе с домашней едой', emoji: '☕' },
      { id: 2, text: 'Стрит-фуд с мировыми вкусами', emoji: '🌮' },
      { id: 3, text: 'Здоровое кафе / веган-бар', emoji: '🌱' },
      { id: 4, text: 'Гриль-бар с живой музыкой', emoji: '🎸' },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════
   Client-side profile computation (fallback)
   ═══════════════════════════════════════════════════════════ */
function computeProfile(answers: Record<number, number[]>): GastroProfile {
  const axes: Record<string, number> = {
    spicy: 5, sweet: 5, sour: 5, bitter: 5, umami: 5, salty: 5,
    exotic: 5, traditional: 5, healthy: 5, indulgent: 5, adventurous: 5, comfort: 5,
  };

  // Q0 — spicy
  const a0 = answers[0]?.[0] ?? 2;
  axes.spicy = [10, 7, 4, 1][a0] ?? 5;

  // Q1 — sweet
  const a1 = answers[1]?.[0] ?? 1;
  axes.sweet = [10, 7, 5, 2][a1] ?? 5;

  // Q2 — exotic vs traditional
  const a2 = answers[2]?.[0] ?? 1;
  axes.exotic = [10, 7, 3, 1][a2] ?? 5;
  axes.traditional = [1, 4, 7, 10][a2] ?? 5;

  // Q3 — protein preference affects umami
  const a3 = answers[3]?.[0] ?? 0;
  axes.umami = [8, 6, 9, 4][a3] ?? 5;

  // Q7 — taste complexity
  const a7 = answers[7]?.[0] ?? 0;
  axes.bitter = a7 === 0 ? 7 : a7 === 1 ? 4 : a7 === 2 ? 5 : 3;
  axes.sour = a7 === 1 ? 7 : 5;

  // Q9 — health
  const a9 = answers[9]?.[0] ?? 2;
  axes.healthy = [10, 8, 5, 2][a9] ?? 5;
  axes.indulgent = [2, 4, 6, 10][a9] ?? 5;

  // Q13 — approach
  const a13 = answers[13]?.[0] ?? 0;
  axes.adventurous = a13 === 0 ? 9 : a13 === 2 ? 7 : a13 === 1 ? 4 : 3;
  axes.comfort = a13 === 3 ? 9 : a13 === 2 ? 7 : a13 === 0 ? 4 : 3;

  // Q14 — restaurant type tweaks
  const a14 = answers[14]?.[0] ?? 0;
  if (a14 === 0) { axes.adventurous = Math.min(10, axes.adventurous + 2); }
  if (a14 === 1) { axes.comfort = Math.min(10, axes.comfort + 2); }
  if (a14 === 3) { axes.healthy = Math.min(10, axes.healthy + 2); }

  // Salty from Q5 (drinks) and Q6 (cheese)
  const a5 = answers[5]?.[0] ?? 3;
  const a6 = answers[6]?.[0] ?? 2;
  axes.salty = Math.round((a5 === 1 ? 7 : a5 === 0 ? 6 : 4) * 0.5 + ([8, 5, 4, 2][a6] ?? 4) * 0.5);

  // Determine archetype
  const sorted = Object.entries(axes).sort((a, b) => b[1] - a[1]);
  const topKeys = sorted.slice(0, 3).map(([k]) => k);

  let archetype = 'Гурман-исследователь';
  let archetypeEmoji = '🧭';
  let archetypeDescription = 'Вы открыты новому и любите яркие вкусовые впечатления.';

  if (topKeys.includes('healthy') && topKeys.includes('comfort')) {
    archetype = 'Осознанный гедонист';
    archetypeEmoji = '🧘';
    archetypeDescription = 'Вы находите баланс между удовольствием и заботой о себе.';
  } else if (topKeys.includes('spicy') && topKeys.includes('exotic')) {
    archetype = 'Вкусовой адреналинщик';
    archetypeEmoji = '🔥';
    archetypeDescription = 'Вас тянет к ярким, острым и необычным вкусам со всего мира.';
  } else if (topKeys.includes('traditional') && topKeys.includes('comfort')) {
    archetype = 'Хранитель традиций';
    archetypeEmoji = '🏡';
    archetypeDescription = 'Вы цените проверенные рецепты, уют и домашний вкус.';
  } else if (topKeys.includes('sweet') && topKeys.includes('indulgent')) {
    archetype = 'Сладкая душа';
    archetypeEmoji = '🍰';
    archetypeDescription = 'Десерты — ваша слабость, и вы превращаете каждый приём пищи в праздник.';
  } else if (topKeys.includes('umami') && topKeys.includes('adventurous')) {
    archetype = 'Гурман-исследователь';
    archetypeEmoji = '🧭';
    archetypeDescription = 'Вы ищете глубину вкуса и не боитесь кулинарных экспериментов.';
  } else if (topKeys.includes('healthy')) {
    archetype = 'ЗОЖ-гурме';
    archetypeEmoji = '🥑';
    archetypeDescription = 'Здоровье на первом месте, но вкус не менее важен.';
  } else if (topKeys.includes('indulgent') && topKeys.includes('adventurous')) {
    archetype = 'Эпикуреец';
    archetypeEmoji = '👑';
    archetypeDescription = 'Жизнь одна — и вы берёте от неё максимум гастрономических впечатлений.';
  }

  // Dietary tags
  const dietaryTags: string[] = [];
  if (axes.healthy >= 8) dietaryTags.push('ЗОЖ');
  if (answers[3]?.[0] === 3) dietaryTags.push('Вегетарианство');
  if (axes.spicy >= 8) dietaryTags.push('Острое');
  if (axes.exotic >= 8) dietaryTags.push('Экзотика');
  if (axes.sweet >= 8) dietaryTags.push('Сладкоежка');
  if (axes.comfort >= 8) dietaryTags.push('Комфорт-фуд');

  // Top axes names
  const AXIS_LABELS: Record<string, string> = {
    spicy: 'Острота', sweet: 'Сладкое', sour: 'Кислое', bitter: 'Горечь',
    umami: 'Умами', salty: 'Солёное', exotic: 'Экзотика', traditional: 'Традиции',
    healthy: 'ЗОЖ', indulgent: 'Удовольствие', adventurous: 'Авантюризм', comfort: 'Комфорт',
  };
  const topAxes = sorted.slice(0, 4).filter(([, v]) => v >= 7).map(([k]) => AXIS_LABELS[k] || k);

  return { archetype, archetypeEmoji, archetypeDescription, axes, dietaryTags, topAxes };
}

/* ═══════════════════════════════════════════════════════════
   Floating Emojis
   ═══════════════════════════════════════════════════════════ */
const FOOD_EMOJIS = ['🍕', '🍣', '🌮', '🍰', '🥗', '🍜', '🧁', '🍔', '🥑', '🌶️', '🍩', '🧀', '🍷', '🥩', '🍓'];

function FloatingEmojis() {
  const items = useMemo(() =>
    FOOD_EMOJIS.map((emoji, i) => ({
      emoji,
      left: `${(i * 17 + 5) % 90}%`,
      delay: `${(i * 0.7) % 4}s`,
      duration: `${6 + (i % 5)}s`,
      size: 20 + (i % 3) * 8,
    })), []);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {items.map((item, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: item.left,
            bottom: '-40px',
            fontSize: item.size,
            opacity: 0.15,
            animation: `floatUp ${item.duration} ease-in-out ${item.delay} infinite`,
          }}
        >
          {item.emoji}
        </span>
      ))}
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          10% { opacity: 0.15; }
          90% { opacity: 0.15; }
          100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Loading Screen
   ═══════════════════════════════════════════════════════════ */
function LoadingScreen() {
  const t = useTranslations('quiz');
  const phrases = [
    t('loadingAnalyzing'),
    t('loadingBalance'),
    t('loadingArchetype'),
    t('loadingMatching'),
    t('loadingAlmost'),
  ];
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    const i1 = setInterval(() => setPhraseIdx((p) => (p + 1) % phrases.length), 1800);
    const i2 = setInterval(() => setDots((d) => (d.length >= 3 ? '' : d + '.')), 400);
    return () => { clearInterval(i1); clearInterval(i2); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="flex flex-col items-center justify-center gap-6"
      style={{ minHeight: '80vh', textAlign: 'center', padding: 24 }}
    >
      <div style={{ fontSize: 64, animation: 'spin 3s linear infinite' }}>
        🍽️
      </div>
      <p style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>
        {phrases[phraseIdx]}{dots}
      </p>
      <div
        style={{
          width: 200,
          height: 4,
          borderRadius: 2,
          background: 'var(--bg3)',
          overflow: 'hidden',
          marginTop: 8,
        }}
      >
        <div
          style={{
            height: '100%',
            borderRadius: 2,
            background: 'var(--accent)',
            animation: 'loadBar 2s ease-in-out infinite',
          }}
        />
      </div>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes loadBar {
          0% { width: 0%; margin-left: 0; }
          50% { width: 70%; margin-left: 15%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Recommendation Cards
   ═══════════════════════════════════════════════════════════ */
interface RecoRestaurant {
  id: number;
  slug: string;
  name: string;
  description?: string;
  cuisines?: Array<{ name: string }>;
  city?: { name: string };
  photos?: Array<{ url: string; isCover: boolean }>;
  rating?: number;
  priceLevel?: number;
  averageBill?: number;
  matchPercent: number;
  matchReason: string;
}

function RecoSection() {
  const { isLoggedIn } = useAuthStore();
  const { profile } = useGastroStore();
  const [restaurants, setRestaurants] = useState<RecoRestaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!isLoggedIn || !profile) return;
    setLoading(true);

    const fetchReco = async () => {
      try {
        let res = await gastroApi.getRecoRestaurants(undefined, 8);
        // If no results and we have local answers — sync profile to server first
        if ((!res.data?.items || res.data.items.length === 0)) {
          const localAnswers = useGastroStore.getState().answers;
          if (localAnswers && Object.keys(localAnswers).length > 0) {
            await gastroApi.submitQuiz(localAnswers).catch(() => {});
            res = await gastroApi.getRecoRestaurants(undefined, 8);
          }
        }
        setRestaurants(res.data?.items || []);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchReco();
  }, [isLoggedIn, profile]);

  if (!isLoggedIn || !profile) return null;

  if (loading) {
    return (
      <div style={{ width: '100%', marginTop: 32 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', textAlign: 'center', marginBottom: 16 }}>
          Подбираем рестораны для вас...
        </h2>
        <div className="flex justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)',
              animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
      </div>
    );
  }

  if (error || restaurants.length === 0) return null;

  return (
    <div style={{ width: '100%', maxWidth: 800, marginTop: 32, animation: 'fadeUp 0.6s ease-out 1.4s both' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', textAlign: 'center', marginBottom: 6 }}>
        Рестораны для вас
      </h2>
      <p style={{ fontSize: 14, color: 'var(--text3)', textAlign: 'center', marginBottom: 20 }}>
        На основе вашего гастро-профиля
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 16,
      }}>
        {restaurants.map((r, idx) => (
          <RecoCard key={r.id} restaurant={r} index={idx} />
        ))}
      </div>
    </div>
  );
}

const PRICE_LABELS = ['', '~500 ₽', '~1 000 ₽', '~2 500 ₽', '~5 000 ₽'];

function RecoCard({ restaurant: r, index }: { restaurant: RecoRestaurant; index: number }) {
  const cover = (r.photos?.find((p) => p.isCover) || r.photos?.[0])?.url;
  const [imgError, setImgError] = useState(false);
  const showImage = cover && !imgError && /^https?:\/\//.test(cover);

  return (
    <Link href={`/restaurants/${r.slug}`} style={{ textDecoration: 'none', animation: `fadeUp 0.4s ease-out ${0.1 * index}s both` }}>
      <div
        style={{
          background: 'var(--bg2)',
          border: '1px solid var(--card-border)',
          borderRadius: 16,
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'transform 0.3s, box-shadow 0.3s',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {/* Image */}
        <div style={{ height: 130, position: 'relative', background: 'var(--bg3)', flexShrink: 0 }}>
          {showImage ? (
            <Image src={cover} alt={r.name} fill sizes="240px" style={{ objectFit: 'cover' }} onError={() => setImgError(true)} />
          ) : (
            <div style={{
              width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `linear-gradient(135deg, hsl(${(r.id * 37) % 360}, 50%, 20%), hsl(${(r.id * 37 + 40) % 360}, 45%, 25%))`,
              fontSize: 36,
            }}>
              🍽️
            </div>
          )}
          {/* Match badge */}
          <div style={{
            position: 'absolute', top: 8, right: 8,
            padding: '4px 10px', borderRadius: 20,
            background: r.matchPercent >= 85 ? 'rgba(52,211,153,0.85)' : 'rgba(255,92,40,0.85)',
            backdropFilter: 'blur(8px)',
            color: '#fff', fontSize: 12, fontWeight: 700,
          }}>
            {r.matchPercent}%
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '10px 12px 12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {r.name}
          </div>

          {r.cuisines && r.cuisines.length > 0 && (
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.cuisines.map((c) => c.name).join(', ')}
            </div>
          )}

          <div style={{
            fontSize: 11, color: 'var(--accent)', marginTop: 6, lineHeight: 1.4,
            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {r.matchReason}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 8 }}>
            {r.rating ? (
              <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>
                ⭐ {r.rating.toFixed(1)}
              </span>
            ) : <span />}
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>
              {r.averageBill ? `~${r.averageBill.toLocaleString('ru-RU')} ₽` : PRICE_LABELS[r.priceLevel || 2]}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main Quiz Page
   ═══════════════════════════════════════════════════════════ */
export default function QuizPage() {
  const router = useRouter();
  const t = useTranslations('quiz');
  const { isLoggedIn } = useAuthStore();
  const { quizStep, answers, profile, isSubmitting, setAnswer, nextStep, prevStep, reset, setProfile, setSubmitting } = useGastroStore();

  const [stage, setStage] = useState<'intro' | 'quiz' | 'loading' | 'result'>('intro');
  const [questions] = useState<QuizQuestion[]>(FALLBACK_QUESTIONS);
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('left');
  const [slideKey, setSlideKey] = useState(0);

  // If user already has a profile, show result
  useEffect(() => {
    if (profile && stage === 'intro') {
      setStage('result');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Try to load questions from API
  useEffect(() => {
    gastroApi.getQuestions().catch(() => {});
    // Also try to load existing profile
    if (isLoggedIn) {
      gastroApi.getProfile()
        .then((r) => { if (r.data) setProfile(r.data); })
        .catch(() => {});
    }
  }, [isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentQ = questions[quizStep];
  const selectedOptions = answers[quizStep] || [];
  const progress = ((quizStep + 1) / questions.length) * 100;

  const handleOptionClick = useCallback((optId: number) => {
    const current = answers[quizStep] || [];
    if (currentQ?.multi) {
      const next = current.includes(optId)
        ? current.filter((id) => id !== optId)
        : [...current, optId];
      setAnswer(quizStep, next);
    } else {
      setAnswer(quizStep, [optId]);
    }
  }, [quizStep, answers, currentQ, setAnswer]);

  const handleNext = useCallback(() => {
    if (quizStep < questions.length - 1) {
      setSlideDir('left');
      setSlideKey((k) => k + 1);
      nextStep();
    } else {
      // Submit
      handleSubmit();
    }
  }, [quizStep, questions.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBack = useCallback(() => {
    if (quizStep > 0) {
      setSlideDir('right');
      setSlideKey((k) => k + 1);
      prevStep();
    }
  }, [quizStep, prevStep]);

  const handleSubmit = async () => {
    setStage('loading');
    setSubmitting(true);

    // Try API first
    try {
      const res = await gastroApi.submitQuiz(answers);
      if (res.data) {
        setProfile(res.data);
        setSubmitting(false);
        setTimeout(() => setStage('result'), 2500);
        return;
      }
    } catch {
      // API unavailable — compute client-side
    }

    // Client-side fallback
    const result = computeProfile(answers);
    setProfile(result);
    setSubmitting(false);
    setTimeout(() => setStage('result'), 2500);
  };

  const handleStart = () => {
    reset();
    setStage('quiz');
  };

  const handleRetake = () => {
    reset();
    setStage('intro');
  };

  const handleShare = async () => {
    if (!profile) return;
    const text = t('shareText', { emoji: profile.archetypeEmoji, archetype: profile.archetype });
    if (navigator.share) {
      try { await navigator.share({ title: t('shareTitle'), text }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      alert(t('copiedToClipboard'));
    }
  };

  /* ─── INTRO ─── */
  if (stage === 'intro') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center relative"
        style={{ background: 'var(--bg)', padding: '24px 16px' }}
      >
        <FloatingEmojis />

        <div className="relative z-10 flex flex-col items-center gap-4 max-sm:gap-3 max-w-lg text-center">
          <div
            className="max-sm:text-[48px]"
            style={{
              fontSize: 80,
              lineHeight: 1,
              animation: 'pulse 2s ease-in-out infinite',
            }}
          >
            🍽️
          </div>

          <h1
            className="max-sm:!text-[28px]"
            style={{
              fontSize: 40,
              fontWeight: 800,
              color: 'var(--text)',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            {t('introTitle')}
          </h1>

          <p
            className="max-sm:!text-[15px]"
            style={{
              fontSize: 18,
              color: 'var(--text2)',
              lineHeight: 1.5,
              maxWidth: 380,
            }}
          >
            {t('introDesc')}
            <br />
            {t('introDesc2')}
          </p>

          <button
            onClick={handleStart}
            className="group max-sm:!py-3 max-sm:!px-10 max-sm:!text-[15px]"
            style={{
              padding: '16px 48px',
              borderRadius: 16,
              fontSize: 17,
              fontWeight: 700,
              color: '#fff',
              background: 'var(--accent)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s',
              boxShadow: '0 8px 32px rgba(255,92,40,0.3)',
              marginTop: 8,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(255,92,40,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(255,92,40,0.3)';
            }}
          >
            {t('startButton')} ✨
          </button>

          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
            {t('introNote')}
          </p>
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.08); }
          }
        `}</style>
      </div>
    );
  }

  /* ─── LOADING ─── */
  if (stage === 'loading') {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
        <FloatingEmojis />
        <LoadingScreen />
      </div>
    );
  }

  /* ─── RESULT ─── */
  if (stage === 'result' && profile) {
    return (
      <div
        className="min-h-screen flex flex-col items-center relative"
        style={{ background: 'var(--bg)', padding: '24px 16px' }}
      >
        <FloatingEmojis />

        <div className="relative z-10 flex flex-col items-center gap-4 max-sm:gap-3 w-full" style={{ maxWidth: 840 }}>
          {/* Archetype */}
          <div
            className="max-sm:!text-[48px]"
            style={{
              fontSize: 72,
              lineHeight: 1,
              animation: 'bounceIn 0.6s ease-out',
            }}
          >
            {profile.archetypeEmoji}
          </div>

          <h1
            className="max-sm:!text-[24px]"
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: 'var(--text)',
              textAlign: 'center',
              margin: 0,
              animation: 'fadeUp 0.6s ease-out 0.2s both',
            }}
          >
            {profile.archetype}
          </h1>

          <p
            className="max-sm:!text-[14px]"
            style={{
              fontSize: 16,
              color: 'var(--text2)',
              textAlign: 'center',
              lineHeight: 1.5,
              maxWidth: 380,
              animation: 'fadeUp 0.6s ease-out 0.4s both',
            }}
          >
            {profile.archetypeDescription}
          </p>

          {/* Radar Chart */}
          <div
            className="max-sm:!p-3"
            style={{
              background: 'var(--bg2)',
              border: '1px solid var(--card-border)',
              borderRadius: 20,
              padding: 24,
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              animation: 'fadeUp 0.6s ease-out 0.6s both',
            }}
          >
            <RadarChart axes={profile.axes} size={240} />
          </div>

          {/* Top axes tags */}
          {profile.topAxes.length > 0 && (
            <div
              className="flex flex-wrap gap-2 justify-center"
              style={{ animation: 'fadeUp 0.6s ease-out 0.8s both' }}
            >
              {profile.topAxes.map((axis) => (
                <span
                  key={axis}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 600,
                    background: 'rgba(99,102,241,0.1)',
                    color: '#818cf8',
                    border: '1px solid rgba(99,102,241,0.2)',
                  }}
                >
                  {axis}
                </span>
              ))}
            </div>
          )}

          {/* Dietary tags */}
          {profile.dietaryTags.length > 0 && (
            <div
              className="flex flex-wrap gap-2 justify-center"
              style={{ animation: 'fadeUp 0.6s ease-out 1s both' }}
            >
              {profile.dietaryTags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 600,
                    background: 'rgba(52,211,153,0.1)',
                    color: '#34d399',
                    border: '1px solid rgba(52,211,153,0.2)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div
            className="flex gap-3 w-full mt-2"
            style={{ animation: 'fadeUp 0.6s ease-out 1.2s both' }}
          >
            {!isLoggedIn && (
              <button
                onClick={() => router.push('/login?redirect=/quiz')}
                style={{
                  flex: 1,
                  padding: '14px 20px',
                  borderRadius: 14,
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#fff',
                  background: 'var(--accent)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 20px rgba(255,92,40,0.25)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
              >
                {t('loginSave')}
              </button>
            )}

            <button
              onClick={handleShare}
              style={{
                flex: 1,
                padding: '14px 20px',
                borderRadius: 14,
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--accent)',
                background: 'rgba(255,92,40,0.08)',
                border: '1px solid rgba(255,92,40,0.2)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,92,40,0.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,92,40,0.08)'; }}
            >
              📤 {t('share')}
            </button>
          </div>

          {/* Personalized Recommendations */}
          <RecoSection />

          {/* Retake */}
          <button
            onClick={handleRetake}
            style={{
              padding: '12px 24px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text3)',
              background: 'transparent',
              border: '1px solid var(--card-border)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginTop: 8,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.color = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--card-border)';
              e.currentTarget.style.color = 'var(--text3)';
            }}
          >
            🔄 {t('retake')}
          </button>

          {/* Back to restaurants */}
          <button
            onClick={() => router.push('/restaurants')}
            style={{
              padding: '10px 20px',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text3)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            {t('toRestaurants')}
          </button>
        </div>

        <style>{`
          @keyframes bounceIn {
            0% { transform: scale(0); opacity: 0; }
            60% { transform: scale(1.15); }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes fadeUp {
            0% { transform: translateY(20px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  /* ─── QUIZ QUESTIONS ─── */
  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{ background: 'var(--bg)' }}
    >
      {/* Progress bar */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: 'var(--bg)',
          padding: '16px 20px 12px',
          borderBottom: '1px solid var(--card-border)',
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)' }}>
            {t('stepOf', { current: quizStep + 1, total: questions.length })}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>
            {Math.round(progress)}%
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: 4,
            borderRadius: 2,
            background: 'var(--bg3)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              borderRadius: 2,
              background: 'var(--accent)',
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>

      {/* Question area */}
      <div
        className="flex-1 flex flex-col items-center justify-center"
        style={{ padding: '20px 16px', maxWidth: 520, margin: '0 auto', width: '100%' }}
      >
        <div
          key={slideKey}
          style={{
            width: '100%',
            animation: `slideIn${slideDir === 'left' ? 'Left' : 'Right'} 0.35s ease-out`,
          }}
        >
          {/* Question */}
          <div className="text-center mb-6 max-sm:mb-4">
            <span className="max-sm:!text-[36px]" style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>
              {currentQ?.emoji}
            </span>
            <h2
              className="max-sm:!text-[18px]"
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--text)',
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              {currentQ ? t(`q${currentQ.id}`) : ''}
            </h2>
          </div>

          {/* Options */}
          <div className="flex flex-col gap-2.5 max-sm:gap-2">
            {currentQ?.options.map((opt) => {
              const isSelected = selectedOptions.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => handleOptionClick(opt.id)}
                  className="w-full text-left max-sm:!py-3 max-sm:!px-4 max-sm:!rounded-xl"
                  style={{
                    padding: '16px 20px',
                    borderRadius: 16,
                    border: isSelected
                      ? '2px solid var(--accent)'
                      : '2px solid var(--card-border)',
                    background: isSelected
                      ? 'rgba(255,92,40,0.08)'
                      : 'var(--bg2)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    transform: isSelected ? 'scale(1.02)' : 'none',
                    boxShadow: isSelected
                      ? '0 4px 20px rgba(255,92,40,0.12)'
                      : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'rgba(255,92,40,0.4)';
                      e.currentTarget.style.transform = 'scale(1.01)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'var(--card-border)';
                      e.currentTarget.style.transform = 'none';
                    }
                  }}
                >
                  <span className="max-sm:!text-[22px]" style={{ fontSize: 28, flexShrink: 0 }}>{opt.emoji}</span>
                  <span
                    className="max-sm:!text-[13px]"
                    style={{
                      fontSize: 15,
                      fontWeight: isSelected ? 600 : 500,
                      color: isSelected ? 'var(--accent)' : 'var(--text)',
                      transition: 'color 0.2s',
                    }}
                  >
                    {currentQ ? t(`q${currentQ.id}o${opt.id}`) : opt.text}
                  </span>
                  {isSelected && (
                    <span
                      style={{
                        marginLeft: 'auto',
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: 'var(--accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: 14,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navigation buttons */}
      <div
        style={{
          position: 'sticky',
          bottom: 0,
          background: 'var(--bg)',
          borderTop: '1px solid var(--card-border)',
          padding: '16px 20px',
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          maxWidth: 520,
          margin: '0 auto',
          width: '100%',
        }}
      >
        <button
          onClick={handleBack}
          disabled={quizStep === 0}
          style={{
            flex: 1,
            padding: '14px 20px',
            borderRadius: 14,
            fontSize: 14,
            fontWeight: 600,
            color: quizStep === 0 ? 'var(--text3)' : 'var(--text)',
            background: 'var(--bg2)',
            border: '1px solid var(--card-border)',
            cursor: quizStep === 0 ? 'default' : 'pointer',
            opacity: quizStep === 0 ? 0.4 : 1,
            transition: 'all 0.2s',
          }}
        >
          ← {t('back')}
        </button>
        <button
          onClick={handleNext}
          disabled={selectedOptions.length === 0 || isSubmitting}
          style={{
            flex: 1,
            padding: '14px 20px',
            borderRadius: 14,
            fontSize: 14,
            fontWeight: 600,
            color: '#fff',
            background: selectedOptions.length > 0 ? 'var(--accent)' : 'var(--bg3)',
            border: 'none',
            cursor: selectedOptions.length > 0 ? 'pointer' : 'default',
            opacity: selectedOptions.length === 0 ? 0.4 : 1,
            transition: 'all 0.2s',
            boxShadow: selectedOptions.length > 0 ? '0 4px 16px rgba(255,92,40,0.25)' : 'none',
          }}
          onMouseEnter={(e) => {
            if (selectedOptions.length > 0) e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
          }}
        >
          {quizStep === questions.length - 1 ? `${t('seeResult')} ✨` : `${t('next')} →`}
        </button>
      </div>

      <style>{`
        @keyframes slideInLeft {
          0% { transform: translateX(40px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideInRight {
          0% { transform: translateX(-40px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
