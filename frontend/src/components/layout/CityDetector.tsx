'use client';

import { useState, useEffect, useRef } from 'react';
import { useCityStore } from '@/stores/city.store';
import { referenceApi } from '@/lib/api';

interface CityOption {
  name: string;
  slug: string;
}

export function CityDetector() {
  const { slug, name, prompted, setCity, dismiss } = useCityStore();
  const [cities, setCities] = useState<CityOption[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Wait for store hydration
  useEffect(() => setHydrated(true), []);

  // Fetch cities on open
  useEffect(() => {
    if (!open || cities.length) return;
    referenceApi.getCities().then((res) => {
      setCities(res.data || []);
    }).catch(() => {});
  }, [open, cities.length]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Don't render until hydrated
  if (!hydrated) return null;

  // If prompted and city chosen — show small badge to change city
  if (prompted && slug && name) {
    return (
      <div className="fixed top-[80px] left-4 z-[60]" ref={ref}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium border cursor-pointer transition-all backdrop-blur-md"
          style={{
            background: 'var(--dropdown-bg)',
            borderColor: 'rgba(255,92,40,0.2)',
            color: 'var(--text2)',
          }}
        >
          <span className="text-[11px]">📍</span>
          {name}
          <span className="text-[9px] opacity-40">▾</span>
        </button>

        {open && (
          <div
            className="absolute top-[calc(100%+8px)] left-0 w-[240px] rounded-2xl border p-2 backdrop-blur-md"
            style={{
              background: 'var(--dropdown-bg)',
              borderColor: 'var(--card-border)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск города..."
              className="w-full px-3 py-2 rounded-xl text-[12px] text-[var(--text)] placeholder-[var(--text3)] outline-none border font-sans mb-1.5"
              style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }}
            />
            <div className="max-h-[200px] overflow-y-auto">
              {cities
                .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()))
                .slice(0, 30)
                .map((c) => (
                  <div
                    key={c.slug}
                    onClick={() => {
                      setCity(c.slug, c.name);
                      setOpen(false);
                      setSearch('');
                    }}
                    className="px-3 py-2 rounded-xl text-[12px] cursor-pointer transition-all"
                    style={{
                      color: c.slug === slug ? 'var(--accent)' : 'var(--text2)',
                      background: c.slug === slug ? 'var(--accent-glow)' : 'transparent',
                    }}
                  >
                    {c.name}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // If already prompted but dismissed (no city) — don't show anything
  if (prompted) return null;

  // ─── First visit: prompt to select city ───
  return (
    <div
      className="fixed top-[80px] left-4 z-[60] rounded-2xl border p-4 backdrop-blur-md"
      ref={ref}
      style={{
        background: 'var(--dropdown-bg)',
        borderColor: 'rgba(255,92,40,0.15)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        width: 260,
        animation: 'cityDetectorIn 0.4s ease-out both',
        animationDelay: '1.5s',
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[14px]">📍</span>
          <span className="text-[13px] font-semibold text-[var(--text)]">Ваш город</span>
        </div>
        <button
          onClick={dismiss}
          className="text-[14px] text-[var(--text3)] hover:text-[var(--text)] cursor-pointer bg-transparent border-none p-0 leading-none"
        >
          ✕
        </button>
      </div>
      <p className="text-[11px] text-[var(--text3)] mb-3 leading-snug">
        Укажите город, чтобы видеть рестораны и рекомендации рядом с вами
      </p>

      {/* Quick picks */}
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {[
          { slug: 'moscow', name: 'Москва' },
          { slug: 'spb', name: 'Санкт-Петербург' },
          { slug: 'kazan', name: 'Казань' },
          { slug: 'novosibirsk', name: 'Новосибирск' },
        ].map((c) => (
          <button
            key={c.slug}
            onClick={() => setCity(c.slug, c.name)}
            className="px-3 py-1.5 rounded-full text-[11px] font-medium border cursor-pointer transition-all"
            style={{
              background: 'var(--bg3)',
              borderColor: 'var(--card-border)',
              color: 'var(--text2)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,92,40,0.3)';
              e.currentTarget.style.color = 'var(--accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--card-border)';
              e.currentTarget.style.color = 'var(--text2)';
            }}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Search for other cities */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!cities.length) {
              referenceApi.getCities().then((res) => setCities(res.data || [])).catch(() => {});
            }
          }}
          placeholder="Другой город..."
          className="w-full px-3 py-2 rounded-xl text-[11px] text-[var(--text)] placeholder-[var(--text3)] outline-none border font-sans"
          style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }}
          onFocus={() => {
            if (!cities.length) {
              referenceApi.getCities().then((res) => setCities(res.data || [])).catch(() => {});
            }
          }}
        />
        {search && cities.length > 0 && (
          <div
            className="absolute top-[calc(100%+4px)] left-0 right-0 max-h-[160px] overflow-y-auto rounded-xl border p-1"
            style={{
              background: 'var(--dropdown-bg)',
              borderColor: 'var(--card-border)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}
          >
            {cities
              .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
              .slice(0, 20)
              .map((c) => (
                <div
                  key={c.slug}
                  onClick={() => {
                    setCity(c.slug, c.name);
                    setSearch('');
                  }}
                  className="px-3 py-1.5 rounded-lg text-[11px] cursor-pointer text-[var(--text2)] hover:text-[var(--accent)] hover:bg-[var(--bg3)] transition-all"
                >
                  {c.name}
                </div>
              ))}
            {cities.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())).length === 0 && (
              <div className="px-3 py-2 text-[11px] text-[var(--text3)]">Не найдено</div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes cityDetectorIn {
          0% { opacity: 0; transform: translateY(-16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
