'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/stores/auth.store';
import { useFavoritesStore } from '@/stores/favorites.store';
import { useWishlistStore } from '@/stores/wishlist.store';

interface Restaurant {
  id?: number;
  slug: string;
  name: string;
  description?: string;
  cuisines?: Array<{ name: string }>;
  locations?: Array<{ city?: { name: string }; district?: { name: string } }>;
  ratingAggregate: number;
  reviewCount: number;
  priceLevel?: number;
  averageBill?: number;
  photos?: Array<{ url: string; isCover: boolean }>;
  features?: Array<{ slug: string; name: string; category?: string; icon?: string }>;
  address?: string;
  distanceKm?: number;
  branchCount?: number;
}

const PRICE_SYMBOLS = ['', '₽', '₽₽', '₽₽₽', '₽₽₽₽'];

// Национальные кухни — показываем только их в превью
const NATIONAL_CUISINES = new Set([
  'Итальянская', 'Японская', 'Грузинская', 'Русская', 'Французская',
  'Узбекская', 'Китайская', 'Индийская', 'Американская', 'Мексиканская',
  'Средиземноморская', 'Турецкая', 'Кавказская', 'Европейская', 'Паназиатская',
  'Корейская', 'Тайская', 'Вьетнамская', 'Испанская', 'Греческая',
  'Арабская', 'Марокканская', 'Перуанская', 'Бразильская', 'Немецкая',
  'Австрийская', 'Чешская', 'Польская', 'Армянская', 'Азербайджанская',
  'Татарская', 'Украинская', 'Белорусская', 'Скандинавская', 'Британская',
  'Ирландская', 'Португальская', 'Балканская', 'Ливанская', 'Израильская',
  'Азиатская', 'Восточная',
]);

function isNationalCuisine(name: string): boolean {
  if (NATIONAL_CUISINES.has(name)) return true;
  // Любое прилагательное на -ская/-ский (напр. "Тибетская", "Сингапурский")
  return /ская$|ский$|ское$/i.test(name);
}

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
      <span className="text-[48px] opacity-80 relative z-10 select-none" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}>
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
  const [hovered, setHovered] = useState(false);

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
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="absolute top-3.5 right-3.5 z-10 w-9 h-9 rounded-full flex items-center justify-center text-[15px] transition-all duration-300"
      style={{
        background: isFav ? 'rgba(255,60,60,0.7)' : hovered ? 'rgba(255,80,120,0.45)' : 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: isFav ? '#fff' : hovered ? '#ffb0c8' : 'var(--text2)',
        transform: animating ? 'scale(1.3)' : hovered ? 'scale(1.1)' : 'scale(1)',
      }}>
      {isFav ? '♥' : '♡'}
    </button>
  );
}

function WishlistButton({ restaurantId }: { restaurantId?: number }) {
  const isLoggedIn = useAuthStore(s => s.isLoggedIn);
  const isInWishlist = useWishlistStore(s => restaurantId ? s.ids.has(restaurantId) : false);
  const toggle = useWishlistStore(s => s.toggle);
  const [animating, setAnimating] = useState(false);
  const [hovered, setHovered] = useState(false);

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
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="absolute top-3.5 right-14 z-10 w-9 h-9 rounded-full flex items-center justify-center text-[15px] transition-all duration-300"
      title="Хочу сходить"
      style={{
        background: isInWishlist ? 'rgba(20,184,166,0.7)' : hovered ? 'rgba(20,184,166,0.45)' : 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: isInWishlist ? '#fff' : hovered ? '#99f6e4' : 'var(--text2)',
        transform: animating ? 'scale(1.3)' : hovered ? 'scale(1.1)' : 'scale(1)',
      }}>
      {isInWishlist ? '\u{1F4CC}' : '\u{1F3AF}'}
    </button>
  );
}

export function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  const t = useTranslations('card');
  const cover = (restaurant.photos?.find((p) => p.isCover) || restaurant.photos?.[0])?.url;
  const [imgError, setImgError] = useState(false);
  const location = restaurant.locations?.[0];
  const city = location?.city?.name;
  const address = restaurant.address;
  // Show street (first part of address before comma) + city
  const street = address?.split(',')[0]?.trim();
  const locationLine = [city, street].filter(Boolean).join(', ');

  const nationalCuisines = restaurant.cuisines?.filter(c => isNationalCuisine(c.name)) || [];
  const cuisineLabel = nationalCuisines.length
    ? nationalCuisines.map((c) => c.name).join(', ')
    : t('mixed');

  const isHealthy = restaurant.features?.some((f) =>
    ['vegan', 'healthy', 'vegetarian', 'gluten-free'].includes(f.slug)
  );
  const hasAllergenInfo = restaurant.features?.some((f) => f.slug === 'allergen-info');

  const showImage = cover && !imgError && /^https?:\/\//.test(cover);

  return (
    <Link href={`/restaurants/${restaurant.slug}`}>
      <article
        className="bg-[var(--bg2)] border border-[var(--card-border)] rounded-[16px] overflow-hidden cursor-pointer flex flex-col h-full"
        style={{ transition: 'transform 0.45s, border-color 0.45s, box-shadow 0.45s' }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px) scale(1.01)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(0,0,0,0.1)';
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--glass-border)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = 'none';
          (e.currentTarget as HTMLElement).style.boxShadow = 'none';
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--card-border)';
        }}>
        {/* Image */}
        <div className="h-[160px] relative bg-[var(--bg3)] flex-shrink-0">
          {showImage ? (
            <Image src={cover} alt={restaurant.name} fill sizes="(max-width: 768px) 100vw, 400px" className="object-cover" onError={() => setImgError(true)} />
          ) : (
            <GeneratedCover name={restaurant.name} cuisines={restaurant.cuisines} />
          )}
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, var(--card-fade) 0%, transparent 60%)' }} />

          {/* Badges */}
          <div className="absolute top-3.5 left-3.5 z-10 flex gap-1.5">
            {isHealthy && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-[var(--lime)]"
                style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                🌿 {t('healthy')}
              </span>
            )}
            {hasAllergenInfo && (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-[var(--teal)]"
                style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)' }}>
                🛡️ {t('allergens')}
              </span>
            )}
          </div>

          {/* Wishlist & Favorite buttons */}
          <WishlistButton restaurantId={restaurant.id} />
          <FavoriteButton restaurantId={restaurant.id} />

          {/* Bottom badges on image */}
          <div className="absolute bottom-3 left-4 z-10 flex items-center gap-2">
            {restaurant.distanceKm != null && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}>
                <span className="text-[12px] font-semibold text-[var(--teal)]">
                  📍 {restaurant.distanceKm < 1
                    ? `${Math.round(restaurant.distanceKm * 1000)} м`
                    : `${restaurant.distanceKm} км`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-3.5 pt-2.5 pb-3 relative z-[2] flex-1 flex flex-col">
          <h3 className="text-[14px] font-semibold text-[var(--text)] leading-tight truncate">{restaurant.name}</h3>
          {locationLine && (
            <p className="text-[12px] text-[var(--text3)] mt-1 truncate">{locationLine}</p>
          )}
          {restaurant.description && (
            <p className="text-[11px] text-[var(--text3)] mt-1.5 leading-[1.5] line-clamp-2 opacity-70">
              {restaurant.description}
            </p>
          )}
          {/* Feature tags — minimal icons */}
          {restaurant.features && restaurant.features.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5 overflow-hidden">
              {restaurant.features.slice(0, 4).map(f => (
                <span key={f.slug} className="text-[12px] leading-none flex-shrink-0" title={f.name}>
                  {f.icon || ''}
                </span>
              ))}
              {restaurant.features.length > 4 && (
                <span className="text-[10px] text-[var(--text3)] flex-shrink-0">
                  +{restaurant.features.length - 4}
                </span>
              )}
            </div>
          )}
          <div className="flex items-center justify-between mt-auto pt-2">
            <span className="text-[11px] text-[var(--text3)] truncate">{cuisineLabel}</span>
            <span className="text-[11px] text-[var(--text3)] flex-shrink-0 ml-2">
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
