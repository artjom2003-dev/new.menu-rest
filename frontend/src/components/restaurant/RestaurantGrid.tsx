'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { restaurantApi } from '@/lib/api';
import { RestaurantCard } from './RestaurantCard';

interface RestaurantItem {
  id?: number;
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
  photos?: Array<{ url: string; is_cover?: boolean; isCover?: boolean }>;
  features?: Array<{ slug: string; name: string }>;
  translations?: Record<string, any> | null;
}

function adaptApiItem(r: RestaurantItem) {
  return {
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
    photos: r.photos?.map(p => ({ url: p.url, isCover: p.isCover ?? p.is_cover ?? false })) || [],
    features: r.features || [],
    translations: r.translations || null,
  };
}

export function RestaurantGrid() {
  const [restaurants, setRestaurants] = useState<ReturnType<typeof adaptApiItem>[]>([]);
  const [loading, setLoading] = useState(true);
  const t = useTranslations('grid');

  useEffect(() => {
    let retries = 0;
    const load = () => {
      const PINNED_SLUGS = ['mango-moscow', 'khmeli-suneli-sochi', 'black-market'];
      const EXCLUDED_SLUGS = new Set(['konditerskaya-olega-il-ina', ...PINNED_SLUGS]);
      Promise.all([
        restaurantApi.list({ limit: 30, sortBy: 'rating', status: 'published', hasMenu: 'true' }),
        ...PINNED_SLUGS.map(s => restaurantApi.getBySlug(s).catch(() => null)),
      ])
        .then(([res, ...pinnedResults]) => {
          console.log('[RestaurantGrid] API response:', res.status, res.data?.items?.length);
          const allItems = ((res.data.items || []) as RestaurantItem[]).map(adaptApiItem);
          // Only show restaurants with description and at least one photo
          let filtered = allItems.filter(r => r.description && r.description.length > 10);
          filtered = filtered.filter(r => r.photos && r.photos.length > 0 && r.photos.some(p => p.url?.startsWith('http')));
          // Exclude all "Своя компания" except the one on Амундсена 62
          filtered = filtered.filter(r => {
            if (r.name.toLowerCase().includes('своя компания')) {
              return r.address?.includes('Амундсена') && r.address?.includes('62');
            }
            return true;
          });
          // Exclude pinned and blacklisted
          filtered = filtered.filter(r => !EXCLUDED_SLUGS.has(r.slug));
          // Build final list: pinned first, then filtered
          const result: typeof filtered = [];
          for (const pr of pinnedResults) {
            if (pr?.data) result.push(adaptApiItem(pr.data));
          }
          result.push(...filtered);
          setRestaurants(result.slice(0, 8));
          setLoading(false);
        })
        .catch((err) => {
          console.error('[RestaurantGrid] API error:', err?.response?.status, err?.message);
          if (retries < 2) {
            retries++;
            setTimeout(load, 2000);
          } else {
            setLoading(false);
          }
        });
    };
    load();
  }, []);

  if (!loading && restaurants.length === 0) return null;

  return (
    <>
      <div className="max-w-[1400px] mx-auto px-10 max-md:px-4 max-sm:px-3 pt-4 max-sm:pt-2 pb-4 flex justify-between items-baseline">
        <h2 className="font-serif text-[36px] max-sm:text-[22px] font-bold text-[var(--text)]">{t('recommend')}</h2>
        <a href="/restaurants" className="text-[13px] text-[var(--accent)] font-medium no-underline">
          {t('all')}
        </a>
      </div>

      <div className="max-w-[1400px] mx-auto px-10 max-md:px-4 max-sm:px-3 pb-12 grid grid-cols-4 gap-4 max-xl:grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[240px] rounded-[16px] animate-pulse" style={{ background: 'var(--bg3)' }} />
          ))
        ) : (
          restaurants.map((r) => (
            <RestaurantCard key={r.slug} restaurant={r} />
          ))
        )}
      </div>
    </>
  );
}
