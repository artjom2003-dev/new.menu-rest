'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchStore, ParsedTag } from '@/stores/search.store';
import { searchApi } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

const EXAMPLES = [
  'Где поесть стейк на Патриарших до 2500₽',
  'Уютное место для свидания с итальянской кухней',
  'Ресторан с детским меню и террасой рядом',
  'Веганский ужин без орехов в центре',
];

const TAG_LABELS: Record<ParsedTag['type'], string> = {
  loc: '📍',
  cuisine: '🍳',
  diet: '🥗',
  budget: '💰',
  vibe: '✨',
  occasion: '🎯',
  venue: '🏠',
};

export function AISearchBar() {
  const router = useRouter();
  const { toast } = useToast();
  const { query, setQuery, parsedTags, setParsedTags, setLoading, setResults, results } = useSearchStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleInput = useCallback((val: string) => {
    setQuery(val);
    clearTimeout(timerRef.current);

    if (val.length < 5) {
      setParsedTags([]);
      return;
    }

    setIsAnalyzing(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await searchApi.aiSearch(val);
        const p = res.data.params;
        const tags: ParsedTag[] = [];

        if (p.location) tags.push({ type: 'loc', icon: '📍', label: p.location });
        if (p.cuisine) tags.push({ type: 'cuisine', icon: '🍳', label: p.cuisine });
        if (p.dietary?.length) tags.push({ type: 'diet', icon: '🥗', label: p.dietary.join(', ') });
        if (p.budget) tags.push({ type: 'budget', icon: '💰', label: `до ${p.budget.max.toLocaleString()} ₽` });
        if (p.occasion) tags.push({ type: 'occasion', icon: '🎯', label: p.occasion });
        if (p.atmosphere) tags.push({ type: 'vibe', icon: '✨', label: p.atmosphere });
        if (p.venueType) tags.push({ type: 'venue', icon: '🏠', label: p.venueType });

        setParsedTags(tags);
        setResults(res.data.items || []);
      } catch {
        setParsedTags([]);
        toast('AI-поиск временно недоступен', 'error');
      } finally {
        setIsAnalyzing(false);
      }
    }, 600);
  }, [setQuery, setParsedTags, setResults, toast]);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await searchApi.aiSearch(query);
      const items = res.data.items || [];
      setResults(items);
      if (items.length > 0) {
        router.push('/restaurants?ai=1');
      } else {
        toast('Ничего не найдено, попробуйте другой запрос', 'info');
      }
    } catch {
      toast('Ошибка поиска, попробуйте позже', 'error');
    } finally {
      setLoading(false);
    }
  }, [query, setLoading, setResults, router, toast]);

  return (
    <div>
      <div className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--accent)] mb-2.5">
        <span className="animate-pulse-dot">✨</span>
        Спроси <span className="font-bold">Menu-Rest.AI</span> — просто опиши, чего хочешь
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
          onChange={(e) => handleInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Романтический ужин с видом, без глютена, до 3000 на двоих..."
          className="flex-1 bg-transparent border-none outline-none px-5 py-4 text-[15px] text-[var(--text)] placeholder-[var(--text3)] font-sans"
        />
        <button
          onClick={handleSearch}
          className="btn btn-glow rounded-[16px] px-7 py-3.5 flex-shrink-0">
          Найти
        </button>
      </div>

      {/* Parsed tags */}
      {isAnalyzing && (
        <div className="flex items-center gap-2 mt-3.5 text-[12px] text-[var(--text3)]">
          Анализирую запрос
          <span className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="text-[var(--accent)] text-base animate-[blink_1.4s_infinite_both]"
                style={{ animationDelay: `${i * 0.2}s` }}>.</span>
            ))}
          </span>
        </div>
      )}

      {parsedTags.length > 0 && !isAnalyzing && (
        <div className="flex flex-wrap gap-1.5 mt-3.5">
          {parsedTags.map((tag, i) => (
            <span key={i} className={`ai-tag ${tag.type}`}
              style={{ animationDelay: `${i * 0.05}s` }}>
              <span>{tag.icon}</span>
              {tag.label}
            </span>
          ))}
        </div>
      )}

      {/* AI Results preview */}
      {(results as Array<{ slug: string; name: string; rating?: number; cuisines?: Array<{ name: string }> }>).length > 0 && !isAnalyzing && parsedTags.length > 0 && (
        <div className="mt-4 rounded-[16px] border p-4" style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-semibold text-[var(--text3)]">
              Найдено: {(results as unknown[]).length}
            </span>
            <button onClick={handleSearch}
              className="text-[12px] font-semibold text-[var(--accent)] bg-transparent border-none cursor-pointer hover:underline">
              Показать все →
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            {(results as Array<{ slug: string; name: string; rating?: number; cuisines?: Array<{ name: string }> }>).slice(0, 3).map(r => (
              <a key={r.slug} href={`/restaurants/${r.slug}`}
                className="flex items-center justify-between px-3 py-2 rounded-[10px] no-underline transition-all hover:bg-[var(--card)]">
                <span className="text-[13px] font-medium text-[var(--text)]">{r.name}</span>
                <span className="text-[12px] text-[var(--text3)]">
                  {r.cuisines?.map(c => c.name).join(', ')}
                  {r.rating ? ` · ⭐ ${Number(r.rating).toFixed(1)}` : ''}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Example hints */}
      {(results as unknown[]).length === 0 && (
        <div className="flex flex-wrap gap-2 mt-4 items-center">
          <span className="text-[11px] text-[var(--text3)] font-medium mr-1">Попробуйте:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => handleInput(ex)}
              className="text-[12px] text-[var(--text3)] border border-[var(--card-border)] bg-[var(--card)] px-3.5 py-1.5 rounded-full cursor-pointer transition-all hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-glow)]">
              {ex}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
