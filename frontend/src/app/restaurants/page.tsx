'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { restaurantApi } from '@/lib/api';
import { RestaurantCard } from '@/components/restaurant/RestaurantCard';
import { FiltersBar } from '@/components/search/FilterDropdowns';
import { AddRestaurantModal } from '@/components/restaurant/AddRestaurantModal';
import { RestaurantQuizModal } from '@/components/quiz/RestaurantQuizModal';

interface RestaurantListItem {
  slug: string;
  name: string;
  description?: string;
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
  const sortBy = searchParams.get('sortBy') || 'rating';
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
  const [showQuiz, setShowQuiz] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await restaurantApi.list({ page, limit: 24, city, cuisine, priceLevelMin, priceLevelMax, sortBy: lat ? undefined : sortBy, search, features, metro, district, venueType, ...(hasMenu ? { hasMenu: 'true' } : {}), ...(lat && lng ? { lat, lng } : {}) });
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
    cuisines: r.cuisines || [],
    locations: r.city ? [{ city: { name: r.city.name } }] : [],
    ratingAggregate: r.rating,
    reviewCount: r.reviewCount,
    priceLevel: r.priceLevel,
    averageBill: r.averageBill,
    photos: r.photos?.map(p => ({ url: p.url, isCover: p.is_cover })) || [],
    features: r.features || [],
    distanceKm: r.distanceKm,
  });

  return (
    <>
      <AddRestaurantModal open={showAddModal} onClose={() => setShowAddModal(false)} />
      <RestaurantQuizModal open={showQuiz} onClose={() => setShowQuiz(false)} />

      <div className="max-w-[1400px] mx-auto px-10 pt-10 pb-4">
        <div className="mb-2">
          <h1 className="font-serif text-[42px] font-bold text-[var(--text)]">Рестораны</h1>
          <p className="text-[14px] text-[var(--text3)] mb-6">
            {meta ? `${meta.total} заведений` : 'Загрузка...'}
          </p>
        </div>

        {/* Search */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const params = new URLSearchParams(searchParams.toString());
            if (searchInput.trim()) {
              params.set('search', searchInput.trim());
            } else {
              params.delete('search');
            }
            params.set('page', '1');
            router.push(`/restaurants?${params.toString()}`);
          }}
          className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Название, кухня или блюдо..."
              className="w-full px-5 py-3 pl-11 rounded-full text-[14px] text-[var(--text)] placeholder-[var(--text3)] outline-none border transition-all font-sans"
              style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '')}
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[15px] opacity-40">🔍</span>
          </div>
          <button
            type="submit"
            className="px-6 py-3 rounded-full text-[13px] font-semibold text-white border-none cursor-pointer transition-all"
            style={{ background: 'var(--accent)' }}>
            Найти
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                const params = new URLSearchParams(searchParams.toString());
                params.delete('search');
                params.set('page', '1');
                router.push(`/restaurants?${params.toString()}`);
              }}
              className="px-4 py-3 rounded-full text-[13px] font-semibold border cursor-pointer transition-all"
              style={{ background: 'var(--glass)', color: 'var(--text2)', borderColor: 'var(--glass-border)' }}>
              Сбросить
            </button>
          )}
        </form>
      </div>

      <FiltersBar />

      <div className="max-w-[1400px] mx-auto px-10 pb-6 flex items-center gap-3">
        {lat && (
          <span className="px-4 py-2 rounded-full text-[12px] font-semibold border"
            style={{ background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }}>
            📍 По расстоянию
          </span>
        )}
        {!lat && ['rating', 'created_at', 'name'].map((s) => (
          <button
            key={s}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set('sortBy', s);
              params.set('page', '1');
              router.push(`/restaurants?${params.toString()}`);
            }}
            className="px-4 py-2 rounded-full text-[12px] font-semibold border transition-all cursor-pointer"
            style={{
              background: sortBy === s ? 'var(--accent)' : 'var(--glass)',
              color: sortBy === s ? '#fff' : 'var(--text2)',
              borderColor: sortBy === s ? 'var(--accent)' : 'var(--glass-border)',
            }}>
            {s === 'rating' ? '⭐ По рейтингу' : s === 'created_at' ? '🆕 Новые' : '🔤 По имени'}
          </button>
        ))
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
          className="px-4 py-2 rounded-full text-[12px] font-semibold border transition-all cursor-pointer"
          style={{
            background: hasMenu ? 'linear-gradient(135deg, rgba(57,255,209,0.15), rgba(57,255,209,0.06))' : 'var(--glass)',
            color: hasMenu ? 'var(--teal)' : 'var(--text2)',
            borderColor: hasMenu ? 'rgba(57,255,209,0.3)' : 'var(--glass-border)',
            textShadow: hasMenu ? '0 0 8px rgba(57,255,209,0.3)' : 'none',
          }}>
          🍽️ С меню
        </button>
      </div>

      <div className="max-w-[1400px] mx-auto px-10 pb-10">
        <div className="flex gap-6 items-start">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="grid grid-cols-3 gap-5 max-lg:grid-cols-2 max-sm:grid-cols-1">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-[300px] rounded-[20px] animate-pulse" style={{ background: 'var(--bg3)' }} />
                ))}
              </div>
            ) : restaurants.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🍽️</div>
                <p className="text-[18px] text-[var(--text2)] font-semibold mb-2">Ресторанов не найдено</p>
                <p className="text-[13px] text-[var(--text3)]">Попробуйте изменить фильтры</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-5 max-lg:grid-cols-2 max-sm:grid-cols-1">
                {restaurants.map((r) => (
                  <RestaurantCard key={r.slug} restaurant={adaptRestaurant(r)} />
                ))}
              </div>
            )}
          </div>

          {/* Quiz sidebar card */}
          <div className="w-[220px] shrink-0 sticky top-[88px] max-lg:hidden">
            <button
              onClick={() => setShowQuiz(true)}
              className="group w-full relative overflow-hidden rounded-2xl p-5 cursor-pointer transition-all border text-center"
              style={{
                background: 'linear-gradient(180deg, rgba(255,92,40,0.08) 0%, rgba(186,255,57,0.04) 50%, rgba(57,255,209,0.03) 100%)',
                borderColor: 'rgba(255,92,40,0.2)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(255,92,40,0.5)';
                e.currentTarget.style.boxShadow = '0 0 40px var(--accent-glow)';
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255,92,40,0.2)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = '';
              }}>
              <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-20 blur-3xl"
                style={{ background: 'var(--accent)' }} />
              <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full opacity-15 blur-3xl"
                style={{ background: 'var(--teal)' }} />
              <span className="text-[44px] block mb-3 relative z-10 transition-transform group-hover:scale-110" style={{ transitionDuration: '300ms' }}>
                🧭
              </span>
              <p className="font-serif text-[16px] font-bold text-[var(--text)] mb-1.5 relative z-10 leading-tight">
                Не определились?
              </p>
              <p className="text-[12px] text-[var(--text3)] mb-4 relative z-10 leading-snug">
                Пройдите тест из 5 вопросов — подберём ресторан для вас
              </p>
              <div
                className="relative z-10 w-full py-2.5 rounded-full text-[13px] font-bold text-white transition-all"
                style={{
                  background: 'linear-gradient(135deg, var(--accent), #ff8c42)',
                  boxShadow: '0 4px 20px var(--accent-glow)',
                }}>
                Пройти тест
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* CTA Banner */}
      <div className="max-w-[1400px] mx-auto px-10 pb-8">
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

      {/* Pagination */}
      {meta && meta.pages > 1 && (
        <div className="max-w-[1400px] mx-auto px-10 pb-20 flex justify-center gap-2">
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
      <div className="max-w-[1400px] mx-auto px-10 pt-10 pb-20">
        <div className="h-8 w-48 rounded bg-[var(--bg3)] animate-pulse mb-6" />
        <div className="grid grid-cols-3 gap-5 max-lg:grid-cols-2 max-sm:grid-cols-1">
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
