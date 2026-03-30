'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { restaurantApi, gastroApi } from '@/lib/api';
import { RestaurantCard } from '@/components/restaurant/RestaurantCard';
import { FiltersBar } from '@/components/search/FilterDropdowns';
import { AddRestaurantModal } from '@/components/restaurant/AddRestaurantModal';
import { useGastroStore } from '@/stores/gastro.store';
import { useAuthStore } from '@/stores/auth.store';
import { useCityStore } from '@/stores/city.store';

interface RestaurantListItem {
  slug: string;
  name: string;
  description?: string;
  address?: string;
  cuisines?: Array<{ name: string }>;
  city?: { name: string };
  rating: number;
  reviewCount: number;
  priceLevel?: number;
  averageBill?: number;
  photos?: Array<{ url: string; is_cover: boolean }>;
  features?: Array<{ slug: string; name: string }>;
  distanceKm?: number;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

function SearchWithSuggestions({ value, onChange, onSearch, onClear }: {
  value: string;
  onChange: (v: string) => void;
  onSearch: (q: string) => void;
  onClear?: () => void;
}) {
  const [suggestions, setSuggestions] = useState<Array<{ slug: string; name: string; city?: { name: string } }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (value.trim().length < 2) { setSuggestions([]); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const res = await restaurantApi.list({ search: value.trim(), limit: 6 });
        setSuggestions(res.data.items?.map((r: any) => ({ slug: r.slug, name: r.name, city: r.city })) || []);
        setShowSuggestions(true);
      } catch { setSuggestions([]); }
    }, 250);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); setShowSuggestions(false); onSearch(value); }}
      className="flex gap-2 mb-4">
      <div className="flex-1 relative" ref={wrapperRef}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Название, кухня или блюдо..."
          className="w-full px-5 py-3 pl-11 rounded-full text-[14px] text-[var(--text)] placeholder-[var(--text3)] outline-none border transition-all font-sans"
          style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; if (suggestions.length) setShowSuggestions(true); }}
          onBlur={(e) => { e.currentTarget.style.borderColor = ''; }}
        />
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[15px] opacity-40">🔍</span>

        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 rounded-[14px] border overflow-hidden z-50 shadow-lg"
            style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
            {suggestions.map((s, i) => (
              <button
                key={s.slug}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setShowSuggestions(false);
                  router.push(`/restaurants/${s.slug}`);
                }}
                className="w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-[var(--bg3)] transition-colors"
                style={{ borderTop: i > 0 ? '1px solid var(--card-border)' : undefined }}>
                <span className="text-[13px] text-[var(--text)] truncate">{s.name}</span>
                {s.city?.name && <span className="text-[11px] text-[var(--text3)] ml-2 flex-shrink-0">{s.city.name}</span>}
              </button>
            ))}
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setShowSuggestions(false); onSearch(value); }}
              className="w-full text-left px-4 py-2.5 text-[12px] font-medium text-[var(--accent)] hover:bg-[var(--bg3)] transition-colors"
              style={{ borderTop: '1px solid var(--card-border)' }}>
              Показать все результаты
            </button>
          </div>
        )}
      </div>
      <button
        type="submit"
        className="px-6 py-3 rounded-full text-[13px] font-semibold text-white border-none cursor-pointer transition-all"
        style={{ background: 'var(--accent)' }}>
        Найти
      </button>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="px-4 py-3 rounded-full text-[13px] font-semibold border cursor-pointer transition-all"
          style={{ background: 'var(--glass)', color: 'var(--text2)', borderColor: 'var(--glass-border)' }}>
          Сбросить
        </button>
      )}
    </form>
  );
}

function RestaurantsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<RestaurantListItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);

  const page = Number(searchParams.get('page') || '1');
  const city = searchParams.get('city') || undefined;
  const cuisine = searchParams.get('cuisine') || undefined;
  const priceLevelMin = searchParams.get('priceLevelMin') || undefined;
  const priceLevelMax = searchParams.get('priceLevelMax') || undefined;
  const sortBy = searchParams.get('sortBy') || undefined;
  const search = searchParams.get('search') || undefined;
  const features = searchParams.get('features') || undefined;
  const metro = searchParams.get('metro') || undefined;
  const district = searchParams.get('district') || undefined;
  const venueType = searchParams.get('venueType') || undefined;
  const hasMenu = searchParams.get('hasMenu') === 'true';
  const lat = searchParams.get('lat') || undefined;
  const lng = searchParams.get('lng') || undefined;
  const [searchInput, setSearchInput] = useState(search || '');
  const [showAddModal, setShowAddModal] = useState(false);
  const gastroProfile = useGastroStore(s => s.profile);
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const citySlug = useCityStore(s => s.slug);
  const [recoRestaurants, setRecoRestaurants] = useState<ReturnType<typeof adaptRestaurant>[]>([]);
  const [recoLoading, setRecoLoading] = useState(false);
  const [showReco, setShowReco] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await restaurantApi.list({ page, limit: 24, city: search ? undefined : city, cuisine: search ? undefined : cuisine, priceLevelMin: search ? undefined : priceLevelMin, priceLevelMax: search ? undefined : priceLevelMax, sortBy: lat ? undefined : sortBy, search, features: search ? undefined : features, metro: search ? undefined : metro, district: search ? undefined : district, venueType: search ? undefined : venueType, ...(hasMenu && !search ? { hasMenu: 'true' } : {}), ...(lat && lng && !search ? { lat, lng } : {}) });
      setRestaurants(res.data.items);
      setMeta(res.data.meta);
    } catch {
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  }, [page, city, cuisine, priceLevelMin, priceLevelMax, sortBy, search, features, metro, district, venueType, hasMenu, lat, lng]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const goToPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(p));
    router.push(`/restaurants?${params.toString()}`);
  };

  // Адаптируем данные под интерфейс RestaurantCard
  const adaptRestaurant = (r: RestaurantListItem & { id?: number }) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    address: r.address,
    cuisines: r.cuisines || [],
    locations: r.city ? [{ city: { name: r.city.name } }] : [],
    ratingAggregate: r.rating,
    reviewCount: r.reviewCount,
    priceLevel: r.priceLevel,
    averageBill: r.averageBill,
    photos: r.photos?.map(p => ({ url: p.url, isCover: p.is_cover })) || [],
    features: r.features || [],
    distanceKm: r.distanceKm,
    branchCount: (r as any).branchCount,
  });

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const activeFilterCount = [city, cuisine, priceLevelMin, features, metro, district, venueType, lat].filter(Boolean).length;

  return (
    <>
      <AddRestaurantModal open={showAddModal} onClose={() => setShowAddModal(false)} />

      <div className="max-w-[1400px] mx-auto px-10 max-md:px-4 max-sm:px-3 pt-10 max-sm:pt-4 pb-4 max-sm:pb-2">
        {/* Desktop: title + search */}
        <div className="mb-2 max-sm:hidden">
          <h1 className="font-serif text-[42px] font-bold text-[var(--text)]">Рестораны</h1>
          <p className="text-[14px] text-[var(--text3)] mb-6">
            {meta ? `${meta.total} заведений` : 'Загрузка...'}
          </p>
        </div>

        {/* Mobile: search + filter icon in one row */}
        <div className="hidden max-sm:flex gap-2 items-center mb-3">
          <form
            onSubmit={(e) => { e.preventDefault(); const params = new URLSearchParams(searchParams.toString()); if (searchInput.trim()) { params.set('search', searchInput.trim()); } else { params.delete('search'); } params.set('page', '1'); router.push(`/restaurants?${params.toString()}`); }}
            className="flex-1 relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Ресторан, кухня или блюдо"
              className="w-full px-4 py-2.5 pl-10 rounded-full text-[13px] text-[var(--text)] placeholder-[var(--text3)] outline-none border transition-all font-sans"
              style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--card-border)'; }}
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] opacity-40">🔍</span>
          </form>
          <button
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            className="relative flex items-center justify-center w-10 h-10 rounded-full border cursor-pointer transition-all flex-shrink-0"
            style={{
              background: activeFilterCount > 0 ? 'var(--accent-glow)' : 'var(--bg3)',
              borderColor: activeFilterCount > 0 ? 'var(--accent)' : 'var(--card-border)',
            }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={activeFilterCount > 0 ? 'var(--accent)' : 'var(--text2)'} strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="6" x2="20" y2="6" /><line x1="6" y1="12" x2="18" y2="12" /><line x1="9" y1="18" x2="15" y2="18" />
            </svg>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                style={{ background: 'var(--accent)' }}>
                {activeFilterCount}
              </span>
            )}
          </button>
          {meta && (
            <span className="text-[11px] text-[var(--text3)] whitespace-nowrap flex-shrink-0">{meta.total}</span>
          )}
        </div>

        {/* Desktop search */}
        <div className="max-sm:hidden">
          <SearchWithSuggestions
            value={searchInput}
            onChange={setSearchInput}
            onSearch={(q) => {
              const params = new URLSearchParams(searchParams.toString());
              if (q.trim()) { params.set('search', q.trim()); } else { params.delete('search'); }
              params.set('page', '1');
              router.push(`/restaurants?${params.toString()}`);
            }}
            onClear={search ? () => {
              setSearchInput('');
              const params = new URLSearchParams(searchParams.toString());
              params.delete('search');
              params.set('page', '1');
              router.push(`/restaurants?${params.toString()}`);
            } : undefined}
          />
        </div>
      </div>

      {/* Desktop filters */}
      <div className="max-sm:hidden">
        <FiltersBar />
      </div>

      {/* Mobile filters panel */}
      {mobileFiltersOpen && (
        <div className="hidden max-sm:block">
          <FiltersBar />
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-10 max-md:px-4 max-sm:px-3 pt-4 max-sm:pt-1 pb-6 max-sm:pb-3 flex items-center gap-3 max-sm:gap-2 flex-wrap">
        {lat && (
          <span className="px-4 py-2 rounded-full text-[12px] font-semibold border"
            style={{ background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }}>
            📍 По расстоянию
          </span>
        )}
        {!lat && ['created_at', 'name'].map((s) => {
          const isActive = sortBy === s;
          return (
            <button
              key={s}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                if (isActive) {
                  params.delete('sortBy');
                } else {
                  params.set('sortBy', s);
                }
                params.set('page', '1');
                router.push(`/restaurants?${params.toString()}`);
              }}
              className="px-4 max-sm:px-3 py-2 max-sm:py-1.5 rounded-full text-[12px] max-sm:text-[11px] font-semibold border transition-all cursor-pointer"
              style={{
                background: isActive ? 'var(--accent)' : 'var(--glass)',
                color: isActive ? '#fff' : 'var(--text2)',
                borderColor: isActive ? 'var(--accent)' : 'var(--glass-border)',
              }}>
              {s === 'created_at' ? '🆕 Новые' : '🔤 По имени'}
            </button>
          );
        })
        }

        <div className="w-px h-5" style={{ background: 'var(--card-border)' }} />

        <button
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            if (hasMenu) {
              params.delete('hasMenu');
            } else {
              params.set('hasMenu', 'true');
            }
            params.set('page', '1');
            router.push(`/restaurants?${params.toString()}`);
          }}
          className="px-4 max-sm:px-3 py-2 max-sm:py-1.5 rounded-full text-[12px] max-sm:text-[11px] font-semibold border transition-all cursor-pointer"
          style={{
            background: hasMenu ? 'linear-gradient(135deg, rgba(57,255,209,0.15), rgba(57,255,209,0.06))' : 'var(--glass)',
            color: hasMenu ? 'var(--teal)' : 'var(--text2)',
            borderColor: hasMenu ? 'rgba(57,255,209,0.3)' : 'var(--glass-border)',
            textShadow: hasMenu ? '0 0 8px rgba(57,255,209,0.3)' : 'none',
          }}>
          🍽️ С меню
        </button>
      </div>

      <div className="max-w-[1400px] mx-auto px-10 max-md:px-4 max-sm:px-3 pb-10">
        <div className="flex gap-6 items-start">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Reco header when showing personalized picks */}
            {showReco && (
              <div className="mb-4 flex items-center gap-3">
                <span className="text-[20px]">🎯</span>
                <div>
                  <h2 className="font-serif text-[20px] font-bold text-[var(--text)] m-0">Подобрано для вас</h2>
                  <p className="text-[12px] text-[var(--text3)] m-0">На основе вашего гастро-профиля{citySlug || city ? ` в ${citySlug || city}` : ''}</p>
                </div>
              </div>
            )}

            {(showReco ? recoLoading : loading) ? (
              <div className="grid grid-cols-4 gap-4 max-xl:grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-[300px] rounded-[20px] animate-pulse" style={{ background: 'var(--bg3)' }} />
                ))}
              </div>
            ) : (showReco ? recoRestaurants : restaurants).length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🍽️</div>
                <p className="text-[18px] text-[var(--text2)] font-semibold mb-2">{showReco ? 'Пока нет рекомендаций' : 'Ресторанов не найдено'}</p>
                <p className="text-[13px] text-[var(--text3)]">{showReco ? 'Попробуйте выбрать другой город' : 'Попробуйте изменить фильтры'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-4 max-xl:grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
                {(showReco ? recoRestaurants : restaurants.map(adaptRestaurant)).map((r: any) => (
                  <div key={r.slug} className="relative">
                    {showReco && r.matchPercent && (
                      <div className="absolute top-2 left-2 z-20 px-2.5 py-1 rounded-full text-[11px] font-bold"
                        style={{ background: 'linear-gradient(135deg, var(--accent), #ff8c42)', color: '#fff', boxShadow: '0 2px 8px var(--accent-glow)' }}>
                        {r.matchPercent}% матч
                      </div>
                    )}
                    <RestaurantCard restaurant={r} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Gastro quiz sidebar card */}
          <div className="w-[220px] shrink-0 sticky top-[88px] max-lg:hidden">
            <div className="relative overflow-hidden rounded-2xl p-5 border text-center"
              style={{
                background: 'linear-gradient(180deg, rgba(255,92,40,0.08) 0%, rgba(186,255,57,0.04) 50%, rgba(57,255,209,0.03) 100%)',
                borderColor: 'rgba(255,92,40,0.2)',
              }}>
              <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-20 blur-3xl"
                style={{ background: 'var(--accent)' }} />

              {gastroProfile ? (
                <>
                  <span className="text-[36px] block mb-2 relative z-10">✅</span>
                  <p className="font-serif text-[14px] font-bold text-[var(--text)] mb-1 relative z-10 leading-tight">
                    Гастро-профиль готов
                  </p>
                  <p className="text-[11px] text-[var(--text3)] mb-3 relative z-10">
                    Тип: {(gastroProfile as any).archetypeInfo?.name || (gastroProfile as any).archetype || 'Универсал'}
                  </p>

                  {!showReco ? (
                    <button
                      onClick={async () => {
                        setRecoLoading(true);
                        setShowReco(true);
                        try {
                          let res = await gastroApi.getRecoRestaurants(citySlug || city || undefined, 12);
                          // If no items and user has local answers — sync profile to server first
                          if ((!res.data?.items || res.data.items.length === 0) && useGastroStore.getState().answers && Object.keys(useGastroStore.getState().answers).length > 0) {
                            try {
                              await gastroApi.submitQuiz(useGastroStore.getState().answers);
                              res = await gastroApi.getRecoRestaurants(citySlug || city || undefined, 12);
                            } catch {}
                          }
                          const items = (res.data?.items || []).map((r: any) => ({ ...adaptRestaurant(r), matchPercent: r.matchPercent, matchReason: r.matchReason }));
                          setRecoRestaurants(items);
                        } catch { setRecoRestaurants([]); }
                        setRecoLoading(false);
                      }}
                      className="relative z-10 w-full py-2.5 rounded-full text-[12px] font-bold text-white cursor-pointer border-none transition-all"
                      style={{ background: 'linear-gradient(135deg, var(--accent), #ff8c42)', boxShadow: '0 4px 20px var(--accent-glow)' }}>
                      {recoLoading ? '...' : '🎯 Подобрать для вас'}
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowReco(false)}
                      className="relative z-10 w-full py-2 rounded-full text-[11px] font-medium cursor-pointer border transition-all"
                      style={{ background: 'var(--bg3)', color: 'var(--text3)', borderColor: 'var(--card-border)' }}>
                      Показать все рестораны
                    </button>
                  )}

                  <Link href="/quiz"
                    className="block mt-2 text-[11px] text-[var(--text3)] no-underline relative z-10 hover:text-[var(--accent)] transition-colors">
                    Перепройти квиз
                  </Link>
                </>
              ) : (
                <>
                  <span className="text-[40px] block mb-3 relative z-10">🍽️</span>
                  <p className="font-serif text-[15px] font-bold text-[var(--text)] mb-1.5 relative z-10 leading-tight">
                    Гастро-квиз
                  </p>
                  <p className="text-[11px] text-[var(--text3)] mb-4 relative z-10 leading-snug">
                    Пройдите квиз — подберём рестораны под ваш вкус
                  </p>
                  <Link href="/quiz"
                    className="relative z-10 block w-full py-2.5 rounded-full text-[13px] font-bold text-white no-underline text-center transition-all"
                    style={{ background: 'linear-gradient(135deg, var(--accent), #ff8c42)', boxShadow: '0 4px 20px var(--accent-glow)' }}>
                    Пройти квиз
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CTA Banner */}
      <div className="max-w-[1400px] mx-auto px-10 max-md:px-4 max-sm:px-3 pb-8">
        <div
          className="relative overflow-hidden rounded-[20px] p-8 flex items-center justify-between gap-6 max-sm:flex-col max-sm:text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(255,92,40,0.08) 0%, rgba(186,255,57,0.06) 50%, rgba(57,255,209,0.05) 100%)',
            border: '1px solid var(--card-border)',
          }}
        >
          {/* Decorative glow orbs */}
          <div className="absolute -top-20 -left-20 w-40 h-40 rounded-full opacity-20 blur-3xl" style={{ background: 'var(--accent)' }} />
          <div className="absolute -bottom-16 -right-16 w-32 h-32 rounded-full opacity-15 blur-3xl" style={{ background: 'var(--teal)' }} />

          <div className="relative z-10">
            <h3 className="font-serif text-[22px] font-bold text-[var(--text)] mb-1.5">
              Вы владелец ресторана?
            </h3>
            <p className="text-[14px] text-[var(--text3)] max-w-[420px] leading-relaxed">
              Добавьте своё заведение на MenuRest — получите бронирования, отзывы и новых гостей.
              Абсолютно бесплатно, без комиссий и скрытых платежей.
            </p>
          </div>
          <div className="relative z-10 flex flex-col items-center gap-2 shrink-0">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-7 py-3.5 rounded-full text-[14px] font-semibold text-white border-none cursor-pointer transition-all"
              style={{
                background: 'linear-gradient(135deg, var(--accent), #ff8c42)',
                boxShadow: '0 4px 24px var(--accent-glow)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = '')}
            >
              Оставить заявку
              <span style={{ fontSize: '16px' }}>→</span>
            </button>
            <span className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: 'var(--teal)' }}>
              0 ₽ — без комиссий
            </span>
          </div>
        </div>
      </div>

      {/* Pagination — hidden when showing reco */}
      {!showReco && meta && meta.pages > 1 && (
        <div className="max-w-[1400px] mx-auto px-10 max-md:px-4 max-sm:px-3 pb-20 flex justify-center gap-2">
          {page > 1 && (
            <button onClick={() => goToPage(page - 1)} className="px-4 py-2 rounded-full text-[13px] font-semibold border cursor-pointer"
              style={{ background: 'var(--glass)', color: 'var(--text2)', borderColor: 'var(--glass-border)' }}>
              ← Назад
            </button>
          )}
          {Array.from({ length: Math.min(meta.pages, 7) }, (_, i) => {
            const p = i + 1;
            return (
              <button key={p} onClick={() => goToPage(p)}
                className="w-10 h-10 rounded-full text-[13px] font-semibold border cursor-pointer transition-all"
                style={{
                  background: p === page ? 'var(--accent)' : 'var(--glass)',
                  color: p === page ? '#fff' : 'var(--text2)',
                  borderColor: p === page ? 'var(--accent)' : 'var(--glass-border)',
                }}>
                {p}
              </button>
            );
          })}
          {page < meta.pages && (
            <button onClick={() => goToPage(page + 1)} className="px-4 py-2 rounded-full text-[13px] font-semibold border cursor-pointer"
              style={{ background: 'var(--glass)', color: 'var(--text2)', borderColor: 'var(--glass-border)' }}>
              Далее →
            </button>
          )}
        </div>
      )}
    </>
  );
}

export default function RestaurantsPage() {
  return (
    <Suspense fallback={
      <div className="max-w-[1400px] mx-auto px-10 max-md:px-4 max-sm:px-3 pt-10 pb-20">
        <div className="h-8 w-48 rounded bg-[var(--bg3)] animate-pulse mb-6" />
        <div className="grid grid-cols-4 gap-4 max-xl:grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[300px] rounded-[20px] animate-pulse" style={{ background: 'var(--bg3)' }} />
          ))}
        </div>
      </div>
    }>
      <RestaurantsPageInner />
    </Suspense>
  );
}
