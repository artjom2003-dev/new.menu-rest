'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchStore } from '@/stores/search.store';
import { useGeoStore } from '@/stores/geo.store';
import { useCityStore } from '@/stores/city.store';
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
  const showImg = !!cover?.url;
  return (
    <a href={`/restaurants/${restaurant.slug}`} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1 mx-0.5 px-1.5 py-px rounded-[6px] no-underline transition-all duration-200 hover:brightness-110 align-middle"
      style={{ background: 'linear-gradient(135deg, var(--chat-inline-bg), var(--chat-inline-bg2))', border: '1px solid var(--chat-inline-border)' }}>
      {showImg ? (
        <img src={cover!.url} alt={restaurant.name} className="w-4 h-4 rounded-[4px] object-cover"
          onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      ) : (
        <span className="w-4 h-4 rounded-[4px] flex items-center justify-center text-[9px]" style={{ background: 'var(--bg3)' }}>🍽️</span>
      )}
      <span className="text-[12px] font-bold text-[var(--accent)] whitespace-nowrap">{restaurant.name}</span>
    </a>
  );
}

function renderText(text: string, restaurants: AiRestaurant[]): React.ReactNode[] {
  // Strip markdown formatting
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '$1').replace(/^[*\-•]\s+/gm, '').replace(/^#{1,4}\s+/gm, '');
  // Collapse 3+ newlines to 2, then 2 newlines become paragraph break
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  // Split into paragraphs (double newline), render each with tight margin
  const paragraphs = text.split(/\n\n/);
  const sorted = restaurants.length ? [...restaurants].sort((a, b) => b.name.length - a.name.length) : [];
  const map = sorted.length ? new Map(sorted.map(r => [r.name.toLowerCase(), r])) : null;
  const pattern = sorted.length
    ? new RegExp(`(${sorted.map(r => r.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
    : null;

  return paragraphs.map((para, pi) => {
    // Single newlines within a paragraph become <br>
    const lines = para.split('\n');
    const lineNodes: React.ReactNode[] = [];
    lines.forEach((line, li) => {
      if (li > 0) lineNodes.push(<br key={`br-${pi}-${li}`} />);
      if (pattern && map) {
        const parts = line.split(pattern);
        parts.forEach((part, ci) => {
          const m = map.get(part.toLowerCase());
          if (m) lineNodes.push(<RestaurantInlineCard key={`c-${pi}-${li}-${ci}`} restaurant={m} />);
          else if (part) lineNodes.push(<span key={`t-${pi}-${li}-${ci}`}>{part}</span>);
        });
      } else {
        lineNodes.push(<span key={`t-${pi}-${li}`}>{line}</span>);
      }
    });
    return <p key={`p-${pi}`} style={{ margin: pi > 0 ? '6px 0 0' : '0' }}>{lineNodes}</p>;
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
    <div className="flex items-start gap-2.5" style={{ animation: 'fadeSlideIn 0.3s ease-out both' }}>
      <div className="w-7 h-7 rounded-[9px] flex items-center justify-center text-[13px] shrink-0 mt-0.5 relative"
        style={{ background: 'linear-gradient(135deg, var(--accent), #D44A20)', boxShadow: '0 3px 12px var(--accent-glow)' }}>
        🧠
        <div className="absolute inset-[-5px]" style={{ animation: 'spin 2.5s linear infinite' }}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)', boxShadow: '0 0 6px var(--accent-glow)' }} />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="rounded-[16px] rounded-tl-[5px] px-4 py-3 relative overflow-hidden"
          style={{ background: 'var(--bg2)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', animation: 'borderPulse 2s ease-in-out infinite', border: '1px solid var(--chat-user-border)' }}>

          {streamText ? (
            <div className="text-[13px] text-[var(--text2)] relative z-10" style={{ lineHeight: '1.45' }}>
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
    <div className="relative mt-2 pt-2" style={{ borderTop: '1px solid var(--card-border)' }}>
      <div ref={scrollRef} onScroll={checkScroll}
        className="flex gap-2 overflow-x-auto pb-1 scroll-smooth" style={{ scrollbarWidth: 'none' }}>
        {restaurants.slice(0, 15).map(r => {
          const cover = r.photos?.find(p => p.isCover) || r.photos?.[0];
          const showImg = !!cover?.url;
          return (
            <a key={r.slug} href={`/restaurants/${r.slug}`} target="_blank" rel="noopener noreferrer"
              className="flex-shrink-0 w-[130px] rounded-[12px] overflow-hidden no-underline transition-all duration-300 group hover:-translate-y-1"
              style={{ background: 'var(--bg2)', border: '1px solid var(--card-border)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--chat-user-border)'; e.currentTarget.style.boxShadow = '0 6px 20px var(--accent-glow)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.boxShadow = 'none'; }}>
              <div className="h-[72px] relative overflow-hidden" style={{ background: 'var(--bg3)' }}>
                {showImg ? (
                  <img src={cover!.url} alt={r.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[24px] opacity-40"
                    style={{ background: `linear-gradient(135deg, hsl(${Math.abs(r.name.length * 47) % 360}, 35%, 16%), hsl(${(Math.abs(r.name.length * 47) + 40) % 360}, 30%, 20%))` }}>
                    🍽️
                  </div>
                )}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, var(--card-fade) 0%, transparent 50%)' }} />
                {r.distanceKm !== undefined && (
                  <div className="absolute bottom-1.5 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(0,0,0,0.55)', color: 'var(--accent)', backdropFilter: 'blur(4px)' }}>
                    {r.distanceKm} км
                  </div>
                )}
              </div>
              <div className="px-2 py-1.5">
                <div className="text-[11px] font-bold text-[var(--text)] truncate leading-tight">{r.name}</div>
                <div className="text-[9px] text-[var(--text3)] truncate mt-0.5">
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
          style={{ background: 'var(--bg2)', color: 'var(--text)', boxShadow: '2px 0 12px rgba(0,0,0,0.1)', marginTop: 12 }}>
          ‹
        </button>
      )}
      {canScrollRight && (
        <button onClick={() => scroll(1)}
          className="absolute right-0 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center border-0 cursor-pointer z-10 text-[12px]"
          style={{ background: 'var(--bg2)', color: 'var(--text)', boxShadow: '-2px 0 12px rgba(0,0,0,0.1)', marginTop: 12 }}>
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
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const geoLat = useGeoStore(s => s.lat);
  const geoLng = useGeoStore(s => s.lng);
  const savedCitySlug = useCityStore(s => s.slug);
  const savedCityName = useCityStore(s => s.name);

  const [hasSpeech, setHasSpeech] = useState(false);
  useEffect(() => {
    setHasSpeech(!!(window as any).webkitSpeechRecognition || !!(window as any).SpeechRecognition);
  }, []);

  const toggleVoice = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { toast('Голосовой ввод не поддерживается в этом браузере', 'error'); return; }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    let finalTranscript = '';

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setQuery(finalTranscript + interim);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (finalTranscript.trim()) {
        // Auto-focus input so user can hit Enter or edit
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === 'not-allowed') toast('Разрешите доступ к микрофону', 'error');
    };

    recognition.start();
    setIsListening(true);
  }, [isListening, toast]);

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
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
    try {
      const response = await fetch(`${apiUrl}/search/ai-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, ...(geoLat && geoLng ? { lat: geoLat, lng: geoLng } : {}), ...(savedCitySlug ? { city: savedCitySlug, cityName: savedCityName } : {}), ...(context.length > 0 ? { context } : {}) }),
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
          } catch (_e) {}
        }
      }
      setChatHistory(prev => [...prev, { role: 'ai', text: accText, restaurants: foundR }]);
      setStreamText(''); setStreamRestaurants([]);
    } catch (e) {
      setChatHistory(prev => [...prev, { role: 'ai', text: 'Произошла ошибка. Попробуйте ещё раз.' }]);
      toast(t('aiUnavailable'), 'error');
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [query, isAnalyzing, chatHistory, geoLat, geoLng, savedCitySlug, savedCityName, toast, t]);

  const handleReset = () => {
    setChatHistory([]); setStreamText(''); setStreamRestaurants([]);
    setResults([]); setRecommendation(''); setQuery('');
  };

  return (
    <div>
      {/* Label */}
      {!hasStarted && (
        <div className="inline-flex items-center gap-1.5 text-[13px] max-sm:text-[11px] font-semibold text-[var(--accent)] mb-2.5 flex-wrap">
          <span className="animate-pulse-dot">🔍</span>
          {t('aiLabel')} <span className="font-bold">{t('aiName')}</span> {t('aiDesc')}
        </div>
      )}

      {/* Search input — initial position (before first search) */}
      {!hasStarted && (
        <div className="rounded-[20px] border p-1.5 flex items-center transition-all relative"
          style={{
            background: 'var(--bg3)',
            borderColor: isListening ? 'var(--accent)' : 'var(--search-border)',
            boxShadow: isListening ? '0 0 20px var(--accent-glow)' : 'var(--search-shadow)',
          }}>
          {isListening && (
            <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-[20px] overflow-hidden">
              <div className="h-full rounded-full" style={{ background: 'var(--accent)', width: '40%', animation: 'voiceSweep 1.2s ease-in-out infinite alternate' }} />
            </div>
          )}
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder={isListening ? 'Говорите...' : t('placeholder')}
            className="flex-1 bg-transparent border-none outline-none px-5 max-sm:px-3 py-4 max-sm:py-3 text-[15px] max-sm:text-[13px] text-[var(--text)] placeholder-[var(--text3)] font-sans min-w-0"
            style={isListening && !query ? { caretColor: 'transparent' } : {}} />
          {hasSpeech && (
            <button onClick={toggleVoice} type="button"
              className="w-11 h-11 rounded-full flex items-center justify-center border-0 cursor-pointer self-center mr-1 transition-all duration-200 relative"
              style={{
                background: isListening ? 'var(--accent)' : 'var(--nav-hover)',
                color: isListening ? '#fff' : 'var(--text3)',
              }}
              title={isListening ? 'Остановить запись' : 'Голосовой ввод'}>
              {isListening && (
                <span className="absolute inset-[-4px] rounded-full border-2" style={{ borderColor: 'var(--accent)', animation: 'voiceRing 1.5s ease-out infinite' }} />
              )}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>
          )}
          <button onClick={() => handleSearch()} disabled={isAnalyzing}
            className="btn btn-glow rounded-[16px] px-7 max-sm:px-4 py-3.5 max-sm:py-2.5 max-sm:text-[12px] flex-shrink-0">
            {t('find')}
          </button>
        </div>
      )}

      {/* ═══ CONVERSATION ═══ */}
      {hasStarted && (
        <div className="mt-4">
          {/* Accent line connector */}
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, var(--accent), transparent)' }} />
            <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: 'var(--accent)' }}>AI-диалог</span>
            <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, var(--accent))' }} />
          </div>

          <div className="space-y-2.5">
            {chatHistory.map((msg, i) => (
              <div key={i} style={{ animation: 'fadeSlideIn 0.3s ease-out both', animationDelay: `${Math.min(i * 0.05, 0.2)}s` }}>
                {msg.role === 'user' ? (
                  /* ── User ── */
                  <div className="flex justify-end">
                    <div className="rounded-[16px] rounded-br-[5px] px-4 py-2 max-w-[80%] relative overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, var(--chat-user-bg), var(--chat-user-bg2))',
                        border: '1px solid var(--chat-user-border)',
                        boxShadow: '0 2px 16px var(--accent-glow)',
                      }}>
                      <div className="text-[13px] font-medium text-[var(--text)]">{msg.text}</div>
                    </div>
                  </div>
                ) : (
                  /* ── AI ── */
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-[9px] flex items-center justify-center text-[13px] shrink-0 mt-0.5"
                      style={{ background: 'linear-gradient(135deg, var(--accent), #D44A20)', boxShadow: '0 3px 12px var(--accent-glow)' }}>
                      🤖
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Text */}
                      <div className="rounded-[16px] rounded-tl-[5px] px-4 py-3 border relative"
                        style={{ background: 'var(--bg2)', borderColor: 'var(--chat-ai-border)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                        <div className="text-[13px] text-[var(--text2)]" style={{ lineHeight: '1.45' }}>
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
        <div className="mt-3 rounded-[16px] border p-1 flex items-center transition-all relative"
          style={{
            background: 'var(--bg2)',
            borderColor: isListening ? 'var(--accent)' : 'var(--card-border)',
            boxShadow: isListening ? '0 0 16px var(--accent-glow)' : '0 2px 12px rgba(0,0,0,0.15)',
          }}>
          {isListening && (
            <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-[16px] overflow-hidden">
              <div className="h-full rounded-full" style={{ background: 'var(--accent)', width: '40%', animation: 'voiceSweep 1.2s ease-in-out infinite alternate' }} />
            </div>
          )}
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder={isListening ? 'Говорите...' : 'Уточните: подешевле, ближе, другая кухня...'}
            className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-[13px] text-[var(--text)] placeholder-[var(--text3)] font-sans"
            style={isListening && !query ? { caretColor: 'transparent' } : {}} />
          {hasSpeech && (
            <button onClick={toggleVoice} type="button"
              className="w-9 h-9 rounded-full flex items-center justify-center border-0 cursor-pointer self-center mr-1 transition-all duration-200 relative"
              style={{
                background: isListening ? 'var(--accent)' : 'var(--nav-hover)',
                color: isListening ? '#fff' : 'var(--text3)',
              }}
              title={isListening ? 'Остановить запись' : 'Голосовой ввод'}>
              {isListening && (
                <span className="absolute inset-[-3px] rounded-full border-2" style={{ borderColor: 'var(--accent)', animation: 'voiceRing 1.5s ease-out infinite' }} />
              )}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>
          )}
          {!isAnalyzing && (
            <button onClick={handleReset}
              className="px-3 py-1.5 rounded-full text-[11px] font-medium border-0 cursor-pointer self-center mr-1"
              style={{ background: 'var(--nav-hover)', color: 'var(--text3)' }}>
              Сбросить
            </button>
          )}
          <button onClick={() => handleSearch()} disabled={isAnalyzing}
            className="btn btn-glow rounded-[12px] px-5 py-2.5 flex-shrink-0 text-[13px]">
            {isAnalyzing ? '...' : '→'}
          </button>
        </div>
      )}

      <style>{`
        @keyframes aiSweep { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
        @keyframes fadeSlideIn { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes borderPulse { 0%,100% { border-color: var(--chat-user-border); } 50% { border-color: var(--accent2); } }
        @keyframes thinkingText { 0% { opacity: 0; transform: translateY(4px); } 15% { opacity: 1; transform: translateY(0); } 85% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-4px); } }
        @keyframes voiceSweep { 0% { transform: translateX(-10%); } 100% { transform: translateX(160%); } }
        @keyframes voiceRing { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(1.6); opacity: 0; } }
      `}</style>
    </div>
  );
}
