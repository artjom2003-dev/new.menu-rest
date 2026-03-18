'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchStore } from '@/stores/search.store';
import { useGeoStore } from '@/stores/geo.store';
import { searchApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

interface AiRestaurant {
  id: number;
  name: string;
  slug: string;
  description?: string;
  city?: string;
  address?: string;
  metroStation?: string;
  cuisines?: string[];
  features?: string[];
  rating?: number;
  reviewCount?: number;
  averageBill?: number;
  venueType?: string;
  photos?: { url: string; isCover: boolean }[];
  dishes?: { name: string; price: number | null }[];
  distanceKm?: number;
}

/** Inline mini-card shown when AI mentions a restaurant by name */
function RestaurantInlineCard({ restaurant }: { restaurant: AiRestaurant }) {
  const coverPhoto = restaurant.photos?.find(p => p.isCover) || restaurant.photos?.[0];
  const coverUrl = coverPhoto?.url;
  const showImg = coverUrl && /^https?:\/\//.test(coverUrl);

  return (
    <a
      href={`/restaurants/${restaurant.slug}`}
      className="inline-flex items-center gap-2 mx-0.5 px-2 py-1 rounded-[10px] border no-underline transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md align-middle"
      style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }}
    >
      {showImg ? (
        <img
          src={coverUrl}
          alt={restaurant.name}
          className="w-6 h-6 rounded-[6px] object-cover flex-shrink-0"
        />
      ) : (
        <span className="w-6 h-6 rounded-[6px] flex items-center justify-center text-[12px] flex-shrink-0"
          style={{ background: 'var(--bg2)' }}>
          🍽️
        </span>
      )}
      <span className="text-[14px] font-semibold text-[var(--accent)] whitespace-nowrap">
        {restaurant.name}
      </span>
      {restaurant.rating ? (
        <span className="text-[11px] text-[var(--gold)] whitespace-nowrap">
          ⭐{Number(restaurant.rating).toFixed(1)}
        </span>
      ) : null}
    </a>
  );
}

/** Split recommendation text into parts, replacing restaurant names with inline cards */
function renderRecommendationWithCards(
  text: string,
  restaurants: AiRestaurant[],
): React.ReactNode[] {
  // Strip markdown: **bold**, *italic*, bullet points (* ), headings (### )
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '$1');
  text = text.replace(/^[*\-•]\s+/gm, '');
  text = text.replace(/^#{1,4}\s+/gm, '');
  if (!restaurants.length) return [text];

  // Sort by name length descending so longer names match first (e.g. "Мама Рома" before "Рома")
  const sorted = [...restaurants].sort((a, b) => b.name.length - a.name.length);

  // Build regex that matches any restaurant name (case-insensitive)
  const escaped = sorted.map(r => r.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`(${escaped.join('|')})`, 'gi');

  const parts = text.split(pattern);
  const nameToRestaurant = new Map(sorted.map(r => [r.name.toLowerCase(), r]));

  return parts.map((part, i) => {
    const match = nameToRestaurant.get(part.toLowerCase());
    if (match) {
      return <RestaurantInlineCard key={`card-${i}`} restaurant={match} />;
    }
    return <span key={`text-${i}`}>{part}</span>;
  });
}

export function AISearchBar() {
  const { toast } = useToast();
  const t = useTranslations('search');
  const {
    query, setQuery, setResults,
    results, recommendation, setRecommendation,
  } = useSearchStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const geoLat = useGeoStore(s => s.lat);
  const geoLng = useGeoStore(s => s.lng);

  // Reset previous search results on mount so example hints are visible
  useEffect(() => {
    setResults([]);
    setRecommendation('');
    setQuery('');
  }, [setResults, setRecommendation, setQuery]);

  const handleSearch = useCallback(async (overrideQuery?: string) => {
    const q = overrideQuery ?? query;
    if (!q.trim() || q.length < 3) return;
    setIsAnalyzing(true);
    setRecommendation('');
    setResults([]);

    // SSE requires direct connection — Next.js rewrites buffer responses
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

    try {
      const response = await fetch(`${apiUrl}/search/ai-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, ...(geoLat && geoLng ? { lat: geoLat, lng: geoLng } : {}) }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Stream failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6);
          try {
            const event = JSON.parse(jsonStr);
            if (event.type === 'restaurants') {
              setResults(event.restaurants || []);
              if ((event.restaurants || []).length === 0) {
                toast(t('noResults'), 'info');
              }
            } else if (event.type === 'token') {
              accumulatedText += event.text;
              setRecommendation(accumulatedText);
            } else if (event.type === 'done') {
              // stream complete
            }
          } catch {
            // skip malformed events
          }
        }
      }
    } catch {
      setResults([]);
      setRecommendation('');
      toast(t('aiUnavailable'), 'error');
    } finally {
      setIsAnalyzing(false);
    }
  }, [query, setResults, setRecommendation, toast, t]);

  const restaurants = results as AiRestaurant[];

  return (
    <div>
      <div className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--accent)] mb-2.5">
        <span className="animate-pulse-dot">🔍</span>
        {t('aiLabel')} <span className="font-bold">{t('aiName')}</span> {t('aiDesc')}
      </div>

      {/* Search input */}
      <div
        className="rounded-[20px] border p-1.5 flex transition-all"
        style={{
          background: 'var(--bg3)',
          borderColor: 'var(--card-border)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.4), 0 0 80px var(--accent-glow)',
        }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder={t('placeholder')}
          className="flex-1 bg-transparent border-none outline-none px-5 py-4 text-[15px] text-[var(--text)] placeholder-[var(--text3)] font-sans"
        />
        <button
          onClick={() => handleSearch()}
          disabled={isAnalyzing}
          className="btn btn-glow rounded-[16px] px-7 py-3.5 flex-shrink-0">
          {isAnalyzing ? '...' : t('find')}
        </button>
      </div>

      {/* Loading indicator */}
      {isAnalyzing && (
        <div className="flex items-center gap-2 mt-3.5 text-[12px] text-[var(--text3)]">
          {t('analyzing')}
          <span className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="text-[var(--accent)] text-base animate-[blink_1.4s_infinite_both]"
                style={{ animationDelay: `${i * 0.2}s` }}>.</span>
            ))}
          </span>
        </div>
      )}

      {/* AI Recommendation */}
      {recommendation && (
        <div
          className="mt-4 rounded-[16px] border p-5"
          style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🤖</span>
            <span className="text-[15px] font-semibold text-[var(--accent)]">AI-ассистент</span>
          </div>
          <div
            className="text-[16px] leading-relaxed text-[var(--text2)] whitespace-pre-line"
            style={{ lineHeight: '1.75' }}>
            {renderRecommendationWithCards(recommendation, restaurants)}
            {isAnalyzing && <span className="inline-block w-[2px] h-[1em] bg-[var(--accent)] ml-0.5 animate-pulse align-text-bottom" />}
          </div>
        </div>
      )}

      {/* Restaurant cards */}
      {restaurants.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-semibold text-[var(--text3)]">
              {t('found')}: {restaurants.length}
            </span>
            <button onClick={() => handleSearch()}
              className="text-[13px] font-semibold text-[var(--accent)] bg-transparent border-none cursor-pointer hover:underline">
              {t('showAll')}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {restaurants.slice(0, 6).map(r => {
              const coverPhoto = r.photos?.find(p => p.isCover) || r.photos?.[0];
              const coverUrl = coverPhoto?.url;
              const showImg = coverUrl && /^https?:\/\//.test(coverUrl);

              return (
                <a key={r.slug} href={`/restaurants/${r.slug}`}
                  className="group rounded-[16px] border overflow-hidden no-underline transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(0,0,0,0.3)]"
                  style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
                  {/* Card image */}
                  <div className="h-[140px] relative bg-[var(--bg3)] overflow-hidden">
                    {showImg ? (
                      <img src={coverUrl} alt={r.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[48px] opacity-70"
                        style={{
                          background: `linear-gradient(135deg, hsl(${Math.abs(r.name.length * 47) % 360}, 50%, 20%) 0%, hsl(${(Math.abs(r.name.length * 47) + 40) % 360}, 45%, 25%) 100%)`,
                        }}>
                        🍽️
                      </div>
                    )}
                    <div className="absolute inset-0"
                      style={{ background: 'linear-gradient(to top, var(--bg2), transparent 60%)' }} />
                    {/* Rating badge */}
                    {r.rating && (
                      <div className="absolute bottom-2.5 left-3 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}>
                        <span className="text-[12px] font-semibold text-[var(--gold)]">
                          ⭐ {Number(r.rating).toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Card body */}
                  <div className="px-3.5 pt-2.5 pb-3">
                    <h4 className="text-[15px] font-semibold text-[var(--text)] leading-tight truncate m-0">
                      {r.name}
                    </h4>
                    <p className="text-[12px] text-[var(--text3)] mt-1 truncate m-0">
                      {r.cuisines?.join(', ')}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[12px] text-[var(--text3)] truncate">
                        {r.distanceKm != null
                          ? `📍 ${r.distanceKm < 1 ? `${Math.round(r.distanceKm * 1000)} м` : `${r.distanceKm} км`}`
                          : r.metroStation ? `🚇 ${r.metroStation}` : r.city || ''}
                      </span>
                      {r.averageBill ? (
                        <span className="text-[12px] text-[var(--text3)] flex-shrink-0 ml-2">
                          ~{r.averageBill.toLocaleString('ru-RU')} ₽
                        </span>
                      ) : null}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
