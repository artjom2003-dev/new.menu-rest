'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/* ─── Quiz data ─── */

interface QuizQuestion {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  options: Array<{ label: string; value: string; icon: string }>;
  multiple?: boolean;
}

const QUESTIONS: QuizQuestion[] = [
  {
    id: 'occasion',
    title: 'Какой у вас повод?',
    subtitle: 'Это поможет подобрать правильную атмосферу',
    icon: '🎯',
    options: [
      { label: 'Деловая встреча', value: 'business', icon: '💼' },
      { label: 'Романтический ужин', value: 'romantic', icon: '💕' },
      { label: 'День рождения', value: 'birthday', icon: '🎂' },
      { label: 'Семейный обед', value: 'family', icon: '👨‍👩‍👧‍👦' },
      { label: 'С друзьями', value: 'friends', icon: '🍻' },
      { label: 'Просто поесть', value: 'casual', icon: '🍽️' },
    ],
  },
  {
    id: 'mood',
    title: 'Чего хочется сейчас?',
    subtitle: 'Опишите настроение — мы подберём кухню',
    icon: '😋',
    options: [
      { label: 'Что-то лёгкое и свежее', value: 'light', icon: '🥗' },
      { label: 'Сытное и домашнее', value: 'hearty', icon: '🍲' },
      { label: 'Мясо, гриль, огонь', value: 'meat', icon: '🔥' },
      { label: 'Острое и пряное', value: 'spicy', icon: '🌶️' },
      { label: 'Попробовать что-то новое', value: 'exotic', icon: '🌏' },
      { label: 'Пиццу, пасту, классику', value: 'classic', icon: '🍕' },
      { label: 'Суши, роллы, Азия', value: 'asian', icon: '🍣' },
      { label: 'Не важно, удивите', value: 'any', icon: '🎲' },
    ],
  },
  {
    id: 'budget',
    title: 'Какой бюджет на человека?',
    subtitle: 'Средний чек за одного гостя',
    icon: '💰',
    options: [
      { label: 'До 700 ₽', value: 'cheap', icon: '💵' },
      { label: '700 – 1 500 ₽', value: 'medium', icon: '💳' },
      { label: '1 500 – 3 000 ₽', value: 'expensive', icon: '💎' },
      { label: '3 000+ ₽', value: 'premium', icon: '👑' },
      { label: 'Не важно', value: 'any', icon: '🤷' },
    ],
  },
  {
    id: 'vibe',
    title: 'Какая атмосфера по душе?',
    subtitle: 'Выберите настроение для вечера',
    icon: '✨',
    options: [
      { label: 'Уютная и тихая', value: 'cozy', icon: '🕯️' },
      { label: 'Шумная и весёлая', value: 'lively', icon: '🎵' },
      { label: 'Стильная и модная', value: 'trendy', icon: '🌟' },
      { label: 'На свежем воздухе', value: 'outdoor', icon: '🌿' },
      { label: 'С живой музыкой', value: 'music', icon: '🎸' },
      { label: 'Без разницы', value: 'any', icon: '😎' },
    ],
  },
  {
    id: 'important',
    title: 'Что для вас важно?',
    subtitle: 'Выберите то, без чего не обойтись',
    icon: '⭐',
    multiple: true,
    options: [
      { label: 'Высокий рейтинг', value: 'rating', icon: '⭐' },
      { label: 'Парковка', value: 'parking', icon: '🅿️' },
      { label: 'Детская зона', value: 'kids', icon: '👶' },
      { label: 'Wi-Fi', value: 'wifi', icon: '📶' },
      { label: 'Доставка', value: 'delivery', icon: '🚗' },
      { label: 'Ничего особенного', value: 'none', icon: '👌' },
    ],
  },
];

/* ─── AI Result restaurant type ─── */
interface AiRestaurant {
  slug: string;
  name: string;
  description?: string | null;
  rating?: number;
  cuisines?: string[];
  photos?: Array<{ url: string; isCover: boolean }>;
  averageBill?: number | null;
  city?: string | null;
  metroStation?: string | null;
}

/* ─── Build natural language query from answers ─── */
function buildAiQuery(answers: Record<string, string[]>): string {
  const parts: string[] = [];

  const occasionMap: Record<string, string> = {
    business: 'деловая встреча',
    romantic: 'романтический ужин',
    birthday: 'день рождения, праздник',
    family: 'семейный обед с детьми',
    friends: 'посиделки с друзьями',
    casual: 'быстро перекусить',
  };

  const moodMap: Record<string, string> = {
    light: 'лёгкая еда, салаты, рыба, средиземноморская кухня',
    hearty: 'сытная домашняя еда, русская или грузинская кухня',
    meat: 'мясо, стейки, гриль, барбекю',
    spicy: 'острая еда, азиатская кухня, специи',
    exotic: 'необычная экзотическая кухня, что-нибудь новое',
    classic: 'итальянская кухня, пицца, паста',
    asian: 'японская кухня, суши, роллы, азиатская еда',
  };

  const budgetMap: Record<string, string> = {
    cheap: 'бюджетно, до 700 рублей',
    medium: 'средний чек 700-1500 рублей',
    expensive: 'дорогой ресторан, 1500-3000 рублей',
    premium: 'премиум, от 3000 рублей',
  };

  const vibeMap: Record<string, string> = {
    cozy: 'уютная тихая атмосфера',
    lively: 'шумная весёлая атмосфера',
    trendy: 'модное стильное место',
    outdoor: 'летняя веранда, на свежем воздухе',
    music: 'живая музыка',
  };

  const importantMap: Record<string, string> = {
    rating: 'высокий рейтинг',
    parking: 'с парковкой',
    kids: 'детская зона, для детей',
    wifi: 'с Wi-Fi',
    delivery: 'с доставкой',
  };

  const occasion = answers.occasion?.[0];
  if (occasion && occasion !== 'casual') {
    parts.push(occasionMap[occasion] || occasion);
  }

  const mood = answers.mood?.[0];
  if (mood && mood !== 'any') {
    parts.push(moodMap[mood] || mood);
  }

  const budget = answers.budget?.[0];
  if (budget && budget !== 'any') {
    parts.push(budgetMap[budget] || '');
  }

  const vibe = answers.vibe?.[0];
  if (vibe && vibe !== 'any') {
    parts.push(vibeMap[vibe] || '');
  }

  const important = answers.important?.filter(v => v !== 'none');
  if (important?.length) {
    parts.push(important.map(v => importantMap[v] || v).join(', '));
  }

  return parts.filter(Boolean).join('. ') || 'Посоветуй хороший ресторан';
}

/* ─── Build URL filters from answers ─── */
function buildFilterParams(answers: Record<string, string[]>): URLSearchParams {
  const params = new URLSearchParams();

  // Map mood to cuisine slugs
  const moodToCuisine: Record<string, string[]> = {
    light: ['средиземноморская', 'японская', 'вегетарианская'],
    hearty: ['русская', 'грузинская', 'украинская'],
    meat: ['стейк-хаус', 'американская', 'аргентинская'],
    spicy: ['тайская', 'индийская', 'мексиканская'],
    classic: ['итальянская', 'европейская'],
    asian: ['японская', 'китайская', 'паназиатская'],
  };

  const mood = answers.mood?.[0];
  if (mood && mood !== 'any' && mood !== 'exotic' && moodToCuisine[mood]) {
    params.set('cuisine', moodToCuisine[mood].join(','));
  }

  const budget = answers.budget?.[0];
  if (budget && budget !== 'any') {
    const budgetToPrice: Record<string, [string, string]> = {
      cheap: ['1', '1'],
      medium: ['2', '2'],
      expensive: ['3', '3'],
      premium: ['4', '4'],
    };
    const p = budgetToPrice[budget];
    if (p) {
      params.set('priceLevelMin', p[0]);
      params.set('priceLevelMax', p[1]);
    }
  }

  params.set('sortBy', 'rating');
  params.set('page', '1');
  return params;
}

/* ─── Component ─── */

export function RestaurantQuizModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [aiText, setAiText] = useState('');
  const [aiRestaurants, setAiRestaurants] = useState<AiRestaurant[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setStep(0);
      setAnswers({});
      setAiText('');
      setAiRestaurants([]);
      setAiLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);

  const currentQ = QUESTIONS[step] as QuizQuestion | undefined;

  const handleSelect = useCallback((value: string) => {
    const q = QUESTIONS[step];
    if (!q) return;

    setAnswers(prev => {
      const current = prev[q.id] || [];
      if (q.multiple) {
        if (value === 'any' || value === 'none') return { ...prev, [q.id]: [value] };
        const filtered = current.filter(v => v !== 'any' && v !== 'none');
        if (filtered.includes(value)) {
          return { ...prev, [q.id]: filtered.filter(v => v !== value) };
        }
        return { ...prev, [q.id]: [...filtered, value] };
      }
      return { ...prev, [q.id]: [value] };
    });

    if (!q.multiple) {
      setTimeout(() => {
        if (step < QUESTIONS.length - 1) {
          setStep(s => s + 1);
        }
      }, 300);
    }
  }, [step]);

  const handleNext = () => {
    if (step < QUESTIONS.length - 1) {
      setStep(s => s + 1);
    } else {
      submitQuiz();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const submitQuiz = async () => {
    setStep(QUESTIONS.length);
    setAiLoading(true);

    const query = buildAiQuery(answers);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
      const response = await fetch(`${apiBase}/search/ai-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!response.ok || !response.body) throw new Error('AI unavailable');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let tokenText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const jsonStr = trimmed.slice(6);
          if (jsonStr === '[DONE]') continue;

          try {
            const evt = JSON.parse(jsonStr);
            if (evt.type === 'restaurants' && evt.restaurants) {
              setAiRestaurants(evt.restaurants.slice(0, 6));
            } else if (evt.type === 'token' && evt.text) {
              tokenText += evt.text;
              setAiText(tokenText);
            }
          } catch {
            // skip malformed
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim() && buffer.trim().startsWith('data: ')) {
        try {
          const evt = JSON.parse(buffer.trim().slice(6));
          if (evt.type === 'token' && evt.text) {
            tokenText += evt.text;
            setAiText(tokenText);
          }
        } catch { /* skip */ }
      }

      setAiLoading(false);
      setStep(QUESTIONS.length + 1);
    } catch {
      setAiText('');
      setAiLoading(false);
      setStep(QUESTIONS.length + 1);
    }
  };

  const applyFilters = () => {
    const params = buildFilterParams(answers);
    router.push(`/restaurants?${params.toString()}`);
    onClose();
  };

  if (!open) return null;

  const isLoading = step === QUESTIONS.length;
  const isResults = step === QUESTIONS.length + 1;
  const progress = isResults ? 100 : isLoading ? 95 : ((step) / QUESTIONS.length) * 100;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div
        ref={modalRef}
        className="relative w-full max-w-[600px] max-h-[90vh] overflow-y-auto rounded-[24px] border"
        style={{
          background: 'var(--bg)',
          borderColor: 'var(--card-border)',
          boxShadow: '0 40px 120px rgba(0,0,0,0.6), 0 0 60px var(--accent-glow)',
        }}>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-[16px] cursor-pointer transition-all z-10 border-none"
          style={{ background: 'var(--bg3)', color: 'var(--text3)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)'; }}>
          ✕
        </button>

        {/* Progress */}
        <div className="h-1 rounded-full mx-6 mt-5" style={{ background: 'var(--bg3)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, var(--accent), #ff8c42)',
            }}
          />
        </div>

        <div className="p-8">
          {/* ─── Questions ─── */}
          {currentQ && !isLoading && !isResults && (
            <div key={currentQ.id} className="animate-fade-up">
              <div className="text-center mb-8">
                <span className="text-[48px] block mb-3">{currentQ.icon}</span>
                <h2 className="font-serif text-[26px] font-bold text-[var(--text)] mb-2">
                  {currentQ.title}
                </h2>
                <p className="text-[14px] text-[var(--text3)]">{currentQ.subtitle}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                {currentQ.options.map(opt => {
                  const selected = (answers[currentQ.id] || []).includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleSelect(opt.value)}
                      className="flex items-center gap-3 px-5 py-4 rounded-2xl text-left cursor-pointer transition-all border"
                      style={{
                        background: selected
                          ? 'linear-gradient(135deg, rgba(255,92,40,0.12), rgba(255,92,40,0.05))'
                          : 'var(--bg2)',
                        borderColor: selected ? 'rgba(255,92,40,0.4)' : 'var(--card-border)',
                        transform: selected ? 'scale(1.02)' : 'scale(1)',
                        boxShadow: selected ? '0 0 20px var(--accent-glow)' : 'none',
                      }}>
                      <span className="text-[24px]">{opt.icon}</span>
                      <span
                        className="text-[14px] font-semibold"
                        style={{ color: selected ? 'var(--accent)' : 'var(--text2)' }}>
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8">
                <button
                  onClick={handleBack}
                  className="px-5 py-2.5 rounded-full text-[13px] font-semibold cursor-pointer transition-all border-none"
                  style={{
                    background: step > 0 ? 'var(--bg3)' : 'transparent',
                    color: step > 0 ? 'var(--text2)' : 'transparent',
                    pointerEvents: step > 0 ? 'auto' : 'none',
                  }}>
                  ← Назад
                </button>

                <span className="text-[12px] text-[var(--text3)]">
                  {step + 1} из {QUESTIONS.length}
                </span>

                <button
                  onClick={handleNext}
                  disabled={!(answers[currentQ.id]?.length)}
                  className="px-6 py-2.5 rounded-full text-[13px] font-semibold text-white cursor-pointer transition-all border-none"
                  style={{
                    background: answers[currentQ.id]?.length
                      ? 'linear-gradient(135deg, var(--accent), #ff8c42)'
                      : 'var(--bg3)',
                    color: answers[currentQ.id]?.length ? '#fff' : 'var(--text3)',
                    boxShadow: answers[currentQ.id]?.length ? '0 4px 20px var(--accent-glow)' : 'none',
                    opacity: answers[currentQ.id]?.length ? 1 : 0.5,
                  }}>
                  {step === QUESTIONS.length - 1 ? 'Узнать результат' : 'Далее →'}
                </button>
              </div>
            </div>
          )}

          {/* ─── Loading ─── */}
          {isLoading && (
            <div className="text-center py-12 animate-fade-up">
              <div className="relative inline-block mb-6">
                <span className="text-[64px] block animate-bounce">🔮</span>
                <div className="absolute -inset-4 rounded-full animate-ping opacity-20"
                  style={{ background: 'var(--accent)' }} />
              </div>
              <h2 className="font-serif text-[24px] font-bold text-[var(--text)] mb-3">
                Подбираем идеальные места...
              </h2>
              <p className="text-[14px] text-[var(--text3)]">
                ИИ анализирует ваши предпочтения
              </p>
              <div className="flex justify-center gap-1 mt-6">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-2.5 h-2.5 rounded-full animate-pulse"
                    style={{
                      background: 'var(--accent)',
                      animationDelay: `${i * 200}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ─── Results ─── */}
          {isResults && (
            <div className="animate-fade-up">
              <div className="text-center mb-6">
                <span className="text-[48px] block mb-2">🎉</span>
                <h2 className="font-serif text-[24px] font-bold text-[var(--text)] mb-1">
                  Ваши результаты
                </h2>
                <p className="text-[13px] text-[var(--text3)]">
                  На основе ваших предпочтений
                </p>
              </div>

              {/* AI Recommendation */}
              {aiText && (
                <div
                  className="rounded-2xl p-5 mb-6 border"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,92,40,0.06), rgba(186,255,57,0.04))',
                    borderColor: 'rgba(255,92,40,0.15)',
                  }}>
                  <div className="flex items-start gap-3">
                    <span className="text-[20px] mt-0.5 shrink-0">🤖</span>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-[var(--accent)] mb-2 uppercase tracking-wider">
                        Рекомендация ИИ
                      </p>
                      <div className="text-[13px] text-[var(--text2)] leading-relaxed whitespace-pre-line break-words">
                        {aiText}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Restaurant cards from AI */}
              {aiRestaurants.length > 0 && (
                <div className="space-y-2.5 mb-6">
                  <p className="text-[12px] font-semibold text-[var(--text3)] uppercase tracking-wider">
                    Подобранные рестораны
                  </p>
                  {aiRestaurants.slice(0, 5).map(r => {
                    const coverPhoto = r.photos?.find(p => p.isCover) || r.photos?.[0];
                    return (
                      <Link
                        key={r.slug}
                        href={`/restaurants/${r.slug}`}
                        className="flex items-center gap-4 p-3 rounded-xl border transition-all no-underline"
                        style={{
                          background: 'var(--bg2)',
                          borderColor: 'var(--card-border)',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = 'rgba(255,92,40,0.3)';
                          e.currentTarget.style.transform = 'translateX(4px)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'var(--card-border)';
                          e.currentTarget.style.transform = '';
                        }}>
                        <div
                          className="w-12 h-12 rounded-xl bg-cover bg-center shrink-0"
                          style={{
                            backgroundImage: coverPhoto
                              ? `url(${coverPhoto.url})`
                              : 'linear-gradient(135deg, var(--bg3), var(--bg2))',
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-[var(--text)] truncate">
                            {r.name}
                          </p>
                          <p className="text-[11px] text-[var(--text3)] truncate">
                            {[
                              r.cuisines?.join(', '),
                              r.city,
                              r.metroStation ? `м. ${r.metroStation}` : null,
                              r.averageBill ? `~${r.averageBill} ₽` : null,
                            ].filter(Boolean).join(' · ') || 'Ресторан'}
                          </p>
                        </div>
                        {(r.rating ?? 0) > 0 && (
                          <span className="text-[13px] font-bold shrink-0" style={{ color: 'var(--accent)' }}>
                            {(r.rating ?? 0).toFixed(1)}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}

              {aiRestaurants.length === 0 && !aiText && (
                <div className="text-center py-6">
                  <p className="text-[14px] text-[var(--text3)]">
                    К сожалению, не удалось найти точные совпадения. Попробуйте изменить фильтры.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={applyFilters}
                  className="flex-1 py-3.5 rounded-full text-[14px] font-semibold text-white cursor-pointer transition-all border-none"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent), #ff8c42)',
                    boxShadow: '0 4px 24px var(--accent-glow)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; }}>
                  Показать все результаты
                </button>
                <button
                  onClick={() => { setStep(0); setAnswers({}); setAiText(''); setAiRestaurants([]); }}
                  className="px-5 py-3.5 rounded-full text-[14px] font-semibold cursor-pointer transition-all border"
                  style={{
                    background: 'var(--bg2)',
                    borderColor: 'var(--card-border)',
                    color: 'var(--text2)',
                  }}>
                  Заново
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
