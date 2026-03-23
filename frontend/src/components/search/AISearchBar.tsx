'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchStore } from '@/stores/search.store';
import { useGeoStore } from '@/stores/geo.store';
import { useToast } from '@/components/ui/Toast';

interface AiRestaurant {
  id: number; name: string; slug: string; description?: string;
  city?: string; address?: string; metroStation?: string;
  cuisines?: string[]; features?: string[]; rating?: number;
  reviewCount?: number; averageBill?: number; venueType?: string;
  photos?: { url: string; isCover: boolean }[];
  dishes?: { name: string; price: number | null }[];
  distanceKm?: number;
}

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  restaurants?: AiRestaurant[];
}

function RestaurantInlineCard({ restaurant }: { restaurant: AiRestaurant }) {
  const cover = restaurant.photos?.find(p => p.isCover) || restaurant.photos?.[0];
  const showImg = cover?.url && /^https?:\/\//.test(cover.url);
  return (
    <a href={`/restaurants/${restaurant.slug}`}
      className="inline-flex items-center gap-1.5 mx-0.5 px-2 py-0.5 rounded-[8px] no-underline transition-all duration-200 hover:brightness-125 align-middle"
      style={{ background: 'linear-gradient(135deg, rgba(255,92,40,0.1), rgba(139,92,246,0.06))', border: '1px solid rgba(255,92,40,0.15)' }}>
      {showImg ? (
        <img src={cover!.url} alt={restaurant.name} className="w-5 h-5 rounded-[5px] object-cover" />
      ) : (
        <span className="w-5 h-5 rounded-[5px] flex items-center justify-center text-[10px]" style={{ background: 'var(--bg3)' }}>🍽️</span>
      )}
      <span className="text-[13px] font-bold text-[var(--accent)] whitespace-nowrap">{restaurant.name}</span>
    </a>
  );
}

function renderText(text: string, restaurants: AiRestaurant[]): React.ReactNode[] {
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '$1').replace(/^[*\-•]\s+/gm, '').replace(/^#{1,4}\s+/gm, '');
  if (!restaurants.length) return [text];
  const sorted = [...restaurants].sort((a, b) => b.name.length - a.name.length);
  const escaped = sorted.map(r => r.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(pattern);
  const map = new Map(sorted.map(r => [r.name.toLowerCase(), r]));
  return parts.map((part, i) => {
    const m = map.get(part.toLowerCase());
    return m ? <RestaurantInlineCard key={`c-${i}`} restaurant={m} /> : <span key={`t-${i}`}>{part}</span>;
  });
}

const THINKING_PHRASES = [
  'Листаем меню всех ресторанов города...',
  'Разогреваем печь рекомендаций...',
  'Опрашиваем шеф-поваров...',
  'Заглядываем на кухню...',
  'Бронируем лучший столик...',
  'Проверяем свежесть ингредиентов...',
  'Дегустируем варианты...',
  'Сверяем с картой города...',
  'Натираем бокалы до блеска...',
  'Почти нашли идеальное место...',
];

function ThinkingBubble({ streamText, streamRestaurants, analyzingLabel }: {
  streamText: string; streamRestaurants: AiRestaurant[]; analyzingLabel: string;
}) {
  const [phraseIdx, setPhraseIdx] = useState(0);
  useEffect(() => {
    if (streamText) return;
    const interval = setInterval(() => setPhraseIdx(i => (i + 1) % THINKING_PHRASES.length), 2500);
    return () => clearInterval(interval);
  }, [streamText]);

  return (
    <div className="flex items-start gap-3" style={{ animation: 'fadeSlideIn 0.3s ease-out both' }}>
      <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[15px] shrink-0 mt-1 relative"
        style={{ background: 'linear-gradient(135deg, var(--accent), #D44A20)', boxShadow: '0 3px 12px var(--accent-glow)' }}>
        🧠
        <div className="absolute inset-[-5px]" style={{ animation: 'spin 2.5s linear infinite' }}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)', boxShadow: '0 0 6px var(--accent-glow)' }} />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="rounded-[18px] rounded-tl-[6px] px-5 py-4 relative overflow-hidden"
          style={{ background: 'var(--bg2)', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', animation: 'borderPulse 2s ease-in-out infinite', border: '1px solid rgba(255,92,40,0.2)' }}>

          {streamText ? (
            <div className="text-[14px] text-[var(--text2)] whitespace-pre-line relative z-10" style={{ lineHeight: '1.55' }}>
              {renderText(streamText, streamRestaurants)}
              <span className="inline-block w-[2px] h-[1.1em] ml-0.5 align-text-bottom rounded-full"
                style={{ background: 'var(--accent)', animation: 'pulse 1s infinite' }} />
            </div>
          ) : (
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[13px] font-semibold" style={{ color: 'var(--accent)' }}>{analyzingLabel}</span>
                <span className="inline-flex gap-[3px]">
                  {[0, 1, 2].map(i => (
                    <span key={i} className="inline-block w-[4px] h-[4px] rounded-full"
                      style={{ background: 'var(--accent)', animation: 'pulse 1.4s infinite both', animationDelay: `${i * 0.2}s` }} />
                  ))}
                </span>
              </div>
              {/* Rotating phrases */}
              <div className="h-[18px] overflow-hidden mb-3">
                <div key={phraseIdx} className="text-[12px] text-[var(--text3)]"
                  style={{ animation: 'thinkingText 2.5s ease-in-out' }}>
                  {THINKING_PHRASES[phraseIdx]}
                </div>
              </div>
              {/* Skeleton */}
              <div className="space-y-2">
                {[90, 70, 85, 50, 65].map((w, i) => (
                  <div key={i} className="rounded-full overflow-hidden" style={{ height: 6, width: `${w}%`, background: 'var(--bg3)' }}>
                    <div className="h-full rounded-full"
                      style={{ width: '30%', background: 'linear-gradient(90deg, transparent, rgba(255,92,40,0.18), transparent)', animation: 'aiSweep 1.8s infinite linear', animationDelay: `${i * 0.12}s` }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RestaurantStrip({ restaurants }: { restaurants: AiRestaurant[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => { checkScroll(); }, [restaurants]);

  const scroll = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });
    setTimeout(checkScroll, 400);
  };

  if (!restaurants.length) return null;

  return (
    <div className="relative mt-3 pt-3" style={{ borderTop: '1px solid var(--card-border)' }}>
      <div ref={scrollRef} onScroll={checkScroll}
        className="flex gap-2.5 overflow-x-auto pb-1 scroll-smooth" style={{ scrollbarWidth: 'none' }}>
        {restaurants.slice(0, 15).map(r => {
          const cover = r.photos?.find(p => p.isCover) || r.photos?.[0];
          const showImg = cover?.url && /^https?:\/\//.test(cover.url);
          return (
            <a key={r.slug} href={`/restaurants/${r.slug}`}
              className="flex-shrink-0 w-[150px] rounded-[14px] overflow-hidden no-underline transition-all duration-300 group hover:-translate-y-1"
              style={{ background: 'var(--bg2)', border: '1px solid var(--card-border)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,92,40,0.3)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(255,92,40,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.boxShadow = 'none'; }}>
              <div className="h-[90px] relative overflow-hidden" style={{ background: 'var(--bg3)' }}>
                {showImg ? (
                  <img src={cover!.url} alt={r.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[24px] opacity-40"
                    style={{ background: `linear-gradient(135deg, hsl(${Math.abs(r.name.length * 47) % 360}, 35%, 16%), hsl(${(Math.abs(r.name.length * 47) + 40) % 360}, 30%, 20%))` }}>
                    🍽️
                  </div>
                )}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, var(--bg2) 0%, transparent 40%)' }} />
                {r.distanceKm !== undefined && (
                  <div className="absolute bottom-1.5 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(0,0,0,0.55)', color: 'var(--accent)', backdropFilter: 'blur(4px)' }}>
                    {r.distanceKm} км
                  </div>
                )}
              </div>
              <div className="px-2.5 py-2">
                <div className="text-[12px] font-bold text-[var(--text)] truncate leading-tight">{r.name}</div>
                <div className="text-[10px] text-[var(--text3)] truncate mt-0.5">
                  {r.metroStation ? `м. ${r.metroStation}` : r.cuisines?.slice(0, 2).join(', ') || r.city || ''}
                </div>
              </div>
            </a>
          );
        })}
      </div>

      {/* Scroll arrows */}
      {canScrollLeft && (
        <button onClick={() => scroll(-1)}
          className="absolute left-0 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center border-0 cursor-pointer z-10 text-[12px]"
          style={{ background: 'var(--bg2)', color: 'var(--text)', boxShadow: '2px 0 12px rgba(0,0,0,0.3)', marginTop: 12 }}>
          ‹
        </button>
      )}
      {canScrollRight && (
        <button onClick={() => scroll(1)}
          className="absolute right-0 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center border-0 cursor-pointer z-10 text-[12px]"
          style={{ background: 'var(--bg2)', color: 'var(--text)', boxShadow: '-2px 0 12px rgba(0,0,0,0.3)', marginTop: 12 }}>
          ›
        </button>
      )}
    </div>
  );
}

export function AISearchBar() {
  const { toast } = useToast();
  const t = useTranslations('search');
  const { setResults, setRecommendation } = useSearchStore();
  const [query, setQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [streamText, setStreamText] = useState('');
  const [streamRestaurants, setStreamRestaurants] = useState<AiRestaurant[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const geoLat = useGeoStore(s => s.lat);
  const geoLng = useGeoStore(s => s.lng);

  const hasStarted = chatHistory.length > 0 || isAnalyzing;

  useEffect(() => {
    if (hasStarted) { setResults([{ id: -1 }]); setRecommendation(' '); }
  }, [hasStarted, setResults, setRecommendation]);

  useEffect(() => {
    const lastAi = [...chatHistory].reverse().find(m => m.role === 'ai');
    if (lastAi?.restaurants?.length) { setResults(lastAi.restaurants); setRecommendation(lastAi.text); }
  }, [chatHistory, setResults, setRecommendation]);

  const handleSearch = useCallback(async (overrideQuery?: string) => {
    const q = overrideQuery ?? query;
    if (!q.trim() || q.length < 3 || isAnalyzing) return;
    setChatHistory(prev => [...prev, { role: 'user', text: q }]);
    setQuery('');
    setIsAnalyzing(true);
    setStreamText('');
    setStreamRestaurants([]);
    const context = chatHistory.map(m => ({ role: m.role, text: m.text }));
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    try {
      const response = await fetch(`${apiUrl}/search/ai-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, ...(geoLat && geoLng ? { lat: geoLat, lng: geoLng } : {}), ...(context.length > 0 ? { context } : {}) }),
      });
      if (!response.ok || !response.body) throw new Error('Stream failed');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '', accText = '';
      let foundR: AiRestaurant[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n'); buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.type === 'restaurants') { foundR = ev.restaurants || []; setStreamRestaurants(foundR); }
            else if (ev.type === 'token') { accText += ev.text; setStreamText(accText); }
          } catch {}
        }
      }
      setChatHistory(prev => [...prev, { role: 'ai', text: accText, restaurants: foundR }]);
      setStreamText(''); setStreamRestaurants([]);
    } catch {
      setChatHistory(prev => [...prev, { role: 'ai', text: 'Произошла ошибка. Попробуйте ещё раз.' }]);
      toast(t('aiUnavailable'), 'error');
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [query, isAnalyzing, chatHistory, geoLat, geoLng, toast, t]);

  const handleReset = () => {
    setChatHistory([]); setStreamText(''); setStreamRestaurants([]);
    setResults([]); setRecommendation(''); setQuery('');
  };

  return (
    <div>
      {/* Label */}
      {!hasStarted && (
        <div className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--accent)] mb-2.5">
          <span className="animate-pulse-dot">🔍</span>
          {t('aiLabel')} <span className="font-bold">{t('aiName')}</span> {t('aiDesc')}
        </div>
      )}

      {/* Search input — initial position (before first search) */}
      {!hasStarted && (
        <div className="rounded-[20px] border p-1.5 flex transition-all relative"
          style={{
            background: 'var(--bg3)',
            borderColor: 'rgba(255,92,40,0.2)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.4), 0 0 80px var(--accent-glow)',
          }}>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder={t('placeholder')}
            className="flex-1 bg-transparent border-none outline-none px-5 py-4 text-[15px] text-[var(--text)] placeholder-[var(--text3)] font-sans" />
          <button onClick={() => handleSearch()} disabled={isAnalyzing}
            className="btn btn-glow rounded-[16px] px-7 py-3.5 flex-shrink-0">
            {t('find')}
          </button>
        </div>
      )}

      {/* ═══ CONVERSATION ═══ */}
      {hasStarted && (
        <div className="mt-6">
          {/* Accent line connector */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, var(--accent), transparent)' }} />
            <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: 'var(--accent)' }}>AI-диалог</span>
            <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, var(--accent))' }} />
          </div>

          <div className="space-y-4">
            {chatHistory.map((msg, i) => (
              <div key={i} style={{ animation: 'fadeSlideIn 0.3s ease-out both', animationDelay: `${Math.min(i * 0.05, 0.2)}s` }}>
                {msg.role === 'user' ? (
                  /* ── User ── */
                  <div className="flex justify-end">
                    <div className="rounded-[18px] rounded-br-[6px] px-5 py-3 max-w-[80%] relative overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,92,40,0.14), rgba(255,140,66,0.08))',
                        border: '1px solid rgba(255,92,40,0.2)',
                        boxShadow: '0 2px 16px rgba(255,92,40,0.06)',
                      }}>
                      <div className="text-[14px] font-medium text-[var(--text)]">{msg.text}</div>
                    </div>
                  </div>
                ) : (
                  /* ── AI ── */
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[15px] shrink-0 mt-1"
                      style={{ background: 'linear-gradient(135deg, var(--accent), #D44A20)', boxShadow: '0 3px 12px var(--accent-glow)' }}>
                      🤖
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Text */}
                      <div className="rounded-[18px] rounded-tl-[6px] px-5 py-4 border relative"
                        style={{ background: 'linear-gradient(180deg, var(--bg2), rgba(var(--bg2-rgb, 18,18,24), 0.95))', borderColor: 'var(--card-border)', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
                        <div className="text-[14px] text-[var(--text2)] whitespace-pre-line" style={{ lineHeight: '1.55' }}>
                          {renderText(msg.text, msg.restaurants || [])}
                        </div>
                      </div>

                      {/* Restaurant cards — only those mentioned in AI text */}
                      {msg.restaurants && msg.restaurants.length > 0 && (() => {
                        const textLower = msg.text.toLowerCase();
                        const mentioned = msg.restaurants.filter(r => textLower.includes(r.name.toLowerCase()));
                        return mentioned.length > 0 ? <RestaurantStrip restaurants={mentioned} /> : null;
                      })()}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* ── Streaming / Thinking ── */}
            {isAnalyzing && (
              <ThinkingBubble streamText={streamText} streamRestaurants={streamRestaurants} analyzingLabel={t('analyzing')} />
            )}
          </div>
        </div>
      )}

      {/* Search input — bottom position (after conversation started) */}
      {hasStarted && (
        <div className="mt-4 rounded-[20px] border p-1.5 flex transition-all relative"
          style={{
            background: 'var(--bg2)',
            borderColor: 'var(--card-border)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
          }}>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Уточните: подешевле, ближе, другая кухня..."
            className="flex-1 bg-transparent border-none outline-none px-5 py-4 text-[15px] text-[var(--text)] placeholder-[var(--text3)] font-sans" />
          {!isAnalyzing && (
            <button onClick={handleReset}
              className="px-3 py-1.5 rounded-full text-[11px] font-medium border-0 cursor-pointer self-center mr-1"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text3)' }}>
              Сбросить
            </button>
          )}
          <button onClick={() => handleSearch()} disabled={isAnalyzing}
            className="btn btn-glow rounded-[16px] px-7 py-3.5 flex-shrink-0">
            {isAnalyzing ? '...' : '→'}
          </button>
        </div>
      )}

      <style>{`
        @keyframes aiSweep { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
        @keyframes fadeSlideIn { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes borderPulse { 0%,100% { border-color: rgba(255,92,40,0.2); } 50% { border-color: rgba(255,92,40,0.45); } }
        @keyframes thinkingText { 0% { opacity: 0; transform: translateY(4px); } 15% { opacity: 1; transform: translateY(0); } 85% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-4px); } }
      `}</style>
    </div>
  );
}
