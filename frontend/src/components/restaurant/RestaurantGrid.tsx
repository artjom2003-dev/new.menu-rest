'use client';

import { useState, useEffect } from 'react';
import { restaurantApi } from '@/lib/api';
import { RestaurantCard } from './RestaurantCard';

interface RestaurantItem {
  id?: number;
  slug: string;
  name: string;
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

  useEffect(() => {
    restaurantApi.list({ limit: 6, sortBy: 'rating', status: 'published' })
      .then(res => {
        const items = (res.data.items || []).map(adaptApiItem);
        // Pin "Манго" first
        const pinned = items.filter(r => r.slug === 'mango');
        const rest = items.filter(r => r.slug !== 'mango');
        setRestaurants([...pinned, ...rest].slice(0, 6));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && restaurants.length === 0) return null;

  return (
    <>
      <div className="max-w-[1400px] mx-auto px-10 pt-12 pb-5 flex justify-between items-baseline">
        <h2 className="font-serif text-[36px] font-bold text-[var(--text)]">Рекомендуем попробовать</h2>
        <a href="/restaurants" className="text-[13px] text-[var(--accent)] font-medium no-underline">
          Все →
        </a>
      </div>

      <div className="max-w-[1400px] mx-auto px-10 pb-20 grid grid-cols-3 gap-5 max-lg:grid-cols-2 max-sm:grid-cols-1">
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
