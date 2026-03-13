'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth.store';
import { useFavoritesStore } from '@/stores/favorites.store';

interface Restaurant {
  id?: number;
  slug: string;
  name: string;
  cuisines?: Array<{ name: string }>;
  locations?: Array<{ city?: { name: string }; district?: { name: string } }>;
  ratingAggregate: number;
  reviewCount: number;
  priceLevel?: number;
  averageBill?: number;
  photos?: Array<{ url: string; isCover: boolean }>;
  features?: Array<{ slug: string; name: string }>;
}

const PRICE_SYMBOLS = ['', '₽', '₽₽', '₽₽₽', '₽₽₽₽'];

const CUISINE_EMOJI: Record<string, string> = {
  'Итальянская': '🍝', 'Японская': '🍣', 'Грузинская': '🫓', 'Русская': '🥘',
  'Французская': '🥐', 'Узбекская': '🍲', 'Китайская': '🥡', 'Индийская': '🍛',
  'Американская': '🍔', 'Мексиканская': '🌮', 'Средиземноморская': '🫒',
  'Стейкхаус': '🥩', 'Морепродукты': '🦞', 'Кавказская': '🍢', 'Авторская': '👨‍🍳',
  'Европейская': '🍷', 'Паназиатская': '🥢', 'Вегетарианская': '🥗', 'Фьюжн': '✨',
};

// Generate stable color from string
function hashColor(str: string): { h: number; s: number; l: number } {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const h = ((hash % 360) + 360) % 360;
  return { h, s: 55 + (hash % 20), l: 18 + (hash % 8) };
}

function GeneratedCover({ name, cuisines }: { name: string; cuisines?: Array<{ name: string }> }) {
  const { h, s, l } = hashColor(name);
  const emoji = cuisines?.map(c => CUISINE_EMOJI[c.name]).find(Boolean) || '🍽️';

  return (
    <div className="w-full h-full flex items-center justify-center relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, hsl(${h},${s}%,${l}%) 0%, hsl(${(h + 40) % 360},${s - 10}%,${l + 5}%) 100%)`,
      }}>
      {/* Decorative circles */}
      <div className="absolute rounded-full opacity-10"
        style={{ width: 200, height: 200, top: -40, right: -30, background: `hsl(${h},${s}%,${l + 20}%)` }} />
      <div className="absolute rounded-full opacity-10"
        style={{ width: 120, height: 120, bottom: -20, left: -20, background: `hsl(${(h + 60) % 360},${s}%,${l + 15}%)` }} />
      {/* Emoji */}
      <span className="text-[64px] opacity-80 relative z-10 select-none" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}>
        {emoji}
      </span>
    </div>
  );
}

function FavoriteButton({ restaurantId }: { restaurantId?: number }) {
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const isFav = useFavoritesStore(s => restaurantId ? s.ids.has(restaurantId) : false);
  const toggle = useFavoritesStore(s => s.toggle);
  const [animating, setAnimating] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!restaurantId || !isLoggedIn) return;
    setAnimating(true);
    await toggle(restaurantId);
    setTimeout(() => setAnimating(false), 300);
  };

  return (
    <button
      onClick={handleClick}
      className="absolute top-3.5 right-3.5 z-10 w-9 h-9 rounded-full flex items-center justify-center text-[15px] transition-all duration-300"
      style={{
        background: isFav ? 'rgba(255,60,60,0.7)' : 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: isFav ? '#fff' : 'var(--text2)',
        transform: animating ? 'scale(1.3)' : 'scale(1)',
      }}>
      {isFav ? '♥' : '♡'}
    </button>
  );
}

export function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  const cover = (restaurant.photos?.find((p) => p.isCover) || restaurant.photos?.[0])?.url;
  const [imgError, setImgError] = useState(false);
  const location = restaurant.locations?.[0];
  const locationLabel = [
    location?.city?.name,
    location?.district?.name,
  ].filter(Boolean).join(' • ');

  const isHealthy = restaurant.features?.some((f) =>
    ['vegan', 'healthy', 'vegetarian', 'gluten-free'].includes(f.slug)
  );
  const hasAllergenInfo = restaurant.features?.some((f) => f.slug === 'allergen-info');

  const showImage = cover && !imgError && /^https?:\/\//.test(cover);

  return (
    <Link href={`/restaurants/${restaurant.slug}`}>
      <article
        className="bg-[var(--bg2)] border border-[var(--card-border)] rounded-[20px] overflow-hidden cursor-pointer transition-all duration-[450ms]"
        style={{ transition: 'transform 0.45s, border-color 0.45s, box-shadow 0.45s' }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-8px) scale(1.01)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 32px 80px rgba(0,0,0,0.4)';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = '';
          (e.currentTarget as HTMLElement).style.boxShadow = '';
          (e.currentTarget as HTMLElement).style.borderColor = '';
        }}>
        {/* Image */}
        <div className="h-[200px] relative bg-[var(--bg3)]">
          {showImage ? (
            <Image src={cover} alt={restaurant.name} fill className="object-cover" onError={() => setImgError(true)} />
          ) : (
            <GeneratedCover name={restaurant.name} cuisines={restaurant.cuisines} />
          )}
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, var(--bg2), transparent 60%)' }} />

          {/* Badges */}
          {isHealthy && (
            <span className="absolute top-3.5 left-3.5 z-10 px-3 py-1 rounded-full text-[11px] font-semibold text-[var(--lime)]"
              style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)' }}>
              🌿 ЗОЖ
            </span>
          )}
          {hasAllergenInfo && (
            <span className="absolute top-3.5 left-3.5 z-10 px-3 py-1 rounded-full text-[11px] font-semibold text-[var(--teal)]"
              style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)' }}>
              🛡️ Аллергены
            </span>
          )}

          {/* Favorite button */}
          <FavoriteButton restaurantId={restaurant.id} />
        </div>

        {/* Body */}
        <div className="px-5 py-[18px] relative z-[2]">
          <div className="text-[17px] font-semibold text-[var(--text)] mb-1">{restaurant.name}</div>
          <div className="text-[13px] text-[var(--text3)] mb-3">
            {restaurant.cuisines?.map((c) => c.name).join(', ')}
            {locationLabel ? ` • ${locationLabel}` : ''}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-[var(--gold)]">
              ⭐ {Number(restaurant.ratingAggregate).toFixed(1)}{' '}
              <span className="text-[var(--text3)] font-normal">({restaurant.reviewCount})</span>
            </span>
            <span className="text-[13px] text-[var(--text3)]">
              {restaurant.averageBill
                ? `~${restaurant.averageBill.toLocaleString('ru-RU')} ₽`
                : PRICE_SYMBOLS[restaurant.priceLevel || 2]}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
