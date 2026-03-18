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
  cuisines?: Array<{ name: string }>;
  city?: { name: string };
  rating: number;
  reviewCount: number;
  priceLevel?: number;
  averageBill?: number;
  photos?: Array<{ url: string; is_cover?: boolean; isCover?: boolean }>;
  features?: Array<{ slug: string; name: string }>;
}

function adaptApiItem(r: RestaurantItem) {
  return {
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
    photos: r.photos?.map(p => ({ url: p.url, isCover: p.isCover ?? p.is_cover ?? false })) || [],
    features: r.features || [],
  };
}

export function RestaurantGrid() {
  const [restaurants, setRestaurants] = useState<ReturnType<typeof adaptApiItem>[]>([]);
  const [loading, setLoading] = useState(true);
  const t = useTranslations('grid');

  useEffect(() => {
    restaurantApi.list({ limit: 6, sortBy: 'rating', status: 'published' })
      .then(res => {
        console.log('[RestaurantGrid] API response:', res.status, res.data?.items?.length);
        const items = ((res.data.items || []) as RestaurantItem[]).map(adaptApiItem);
        // Pin "Манго" first
        const pinned = items.filter((r: { slug: string }) => r.slug === 'mango');
        const rest = items.filter((r: { slug: string }) => r.slug !== 'mango');
        setRestaurants([...pinned, ...rest].slice(0, 6));
      })
      .catch((err) => {
        console.error('[RestaurantGrid] API error:', err?.response?.status, err?.message);
      })
      .finally(() => setLoading(false));
  }, []);

  if (!loading && restaurants.length === 0) return null;

  return (
    <>
      <div className="max-w-[1400px] mx-auto px-10 pt-6 pb-5 flex justify-between items-baseline">
        <h2 className="font-serif text-[36px] font-bold text-[var(--text)]">{t('recommend')}</h2>
        <a href="/restaurants" className="text-[13px] text-[var(--accent)] font-medium no-underline">
          {t('all')}
        </a>
      </div>

      <div className="max-w-[1400px] mx-auto px-10 pb-12 grid grid-cols-3 gap-5 max-lg:grid-cols-2 max-sm:grid-cols-1">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[300px] rounded-[20px] animate-pulse" style={{ background: 'var(--bg3)' }} />
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
