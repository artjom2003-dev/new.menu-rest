'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/stores/auth.store';
import { useBudgetStore } from '@/stores/budget.store';
import { AddRestaurantModal } from './AddRestaurantModal';

interface Restaurant {
  id?: number;
  ownerId?: number | null;
  name: string;
  description?: string;
  shortDescription?: string;
  longDescription?: string;
  address?: string;
  metroStation?: string;
  phone?: string;
  website?: string;
  email?: string;
  instagram?: string;
  vk?: string;
  facebook?: string;
  youtube?: string;
  venueType?: string;
  city?: { name: string };
  ratingAggregate: number;
  reviewCount: number;
  averageBill?: number;
  priceLevel?: number;
  hasWifi?: boolean;
  hasDelivery?: boolean;
  cuisines?: Array<{ name: string }>;
  features?: Array<{ name: string; slug: string; category: string; icon?: string }>;
  locations?: Array<{
    address: string;
    metroStation?: string;
    phone?: string;
    city?: { name: string };
    district?: { name: string };
  }>;
  workingHours?: Array<{
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
  }>;
  photos?: Array<{ url: string; isCover: boolean }>;
}

const CUISINE_EMOJI: Record<string, string> = {
  'Итальянская': '🍝', 'Японская': '🍣', 'Грузинская': '🫓', 'Русская': '🥘',
  'Французская': '🥐', 'Узбекская': '🍲', 'Китайская': '🥡', 'Индийская': '🍛',
  'Американская': '🍔', 'Мексиканская': '🌮', 'Средиземноморская': '🫒',
  'Стейкхаус': '🥩', 'Морепродукты': '🦞', 'Кавказская': '🍢', 'Авторская': '👨‍🍳',
  'Европейская': '🍷', 'Паназиатская': '🥢', 'Вегетарианская': '🥗', 'Фьюжн': '✨',
};

function hashColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const h = ((hash % 360) + 360) % 360;
  return { h, s: 55 + (hash % 20), l: 18 + (hash % 8) };
}

function GeneratedCover({ name, cuisines }: { name: string; cuisines?: Array<{ name: string }> }) {
  const { h, s, l } = hashColor(name);
  const emoji = cuisines?.map(c => CUISINE_EMOJI[c.name]).find(Boolean) || '🍽️';
  return (
    <div className="w-full h-full flex items-center justify-center relative overflow-hidden rounded-[16px]"
      style={{ background: `linear-gradient(135deg, hsl(${h},${s}%,${l}%) 0%, hsl(${(h + 40) % 360},${s - 10}%,${l + 5}%) 100%)` }}>
      <div className="absolute rounded-full opacity-10" style={{ width: 250, height: 250, top: -50, right: -40, background: `hsl(${h},${s}%,${l + 20}%)` }} />
      <span className="text-[72px] opacity-80 relative z-10 select-none" style={{ filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.3))' }}>{emoji}</span>
    </div>
  );
}

function PhotoSlider({ photos, name, cuisines }: {
  photos: Array<{ url: string; isCover: boolean }>;
  name: string;
  cuisines?: Array<{ name: string }>;
}) {
  const validPhotos = photos.filter(p => /^https?:\/\//.test(p.url));
  const sorted = [
    ...validPhotos.filter(p => p.isCover),
    ...validPhotos.filter(p => !p.isCover),
  ];

  const [current, setCurrent] = useState(0);
  const [errors, setErrors] = useState<Set<number>>(new Set());

  const visible = sorted.filter((_, i) => !errors.has(i));
  const total = visible.length;
  const hasPhotos = total > 0;
  const realIndex = hasPhotos ? sorted.indexOf(visible[current % total]) : 0;
  const displayIndex = hasPhotos ? (current % total) : 0;

  const go = useCallback((dir: 1 | -1) => {
    setCurrent(prev => {
      const next = prev + dir;
      if (next < 0) return total - 1;
      if (next >= total) return 0;
      return next;
    });
  }, [total]);

  if (!hasPhotos) {
    return <GeneratedCover name={name} cuisines={cuisines} />;
  }

  return (
    <div className="w-full h-full relative overflow-hidden rounded-[16px] bg-[var(--bg3)] group/photo">
      <Image
        key={realIndex}
        src={sorted[realIndex].url}
        alt={`${name} — фото ${displayIndex + 1}`}
        fill
        sizes="(max-width: 768px) 100vw, 600px"
        className="object-cover"
        priority={displayIndex === 0}
        onError={() => setErrors(prev => new Set(prev).add(realIndex))}
      />
      {total > 1 && (
        <>
          <button onClick={() => go(-1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full flex items-center justify-center text-white text-[16px] opacity-0 group-hover/photo:opacity-100 transition-opacity duration-200"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}>‹</button>
          <button onClick={() => go(1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full flex items-center justify-center text-white text-[16px] opacity-0 group-hover/photo:opacity-100 transition-opacity duration-200"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}>›</button>
        </>
      )}
      {total > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)' }}>
          <div className="flex gap-1.5">
            {Array.from({ length: Math.min(total, 7) }).map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className="rounded-full transition-all duration-200 border-none cursor-pointer"
                style={{ width: i === displayIndex ? 16 : 6, height: 6, background: i === displayIndex ? 'white' : 'rgba(255,255,255,0.4)' }} />
            ))}
          </div>
          <span className="text-[11px] text-white/60 ml-1">{displayIndex + 1}/{total}</span>
        </div>
      )}
    </div>
  );
}

function getTodayHours(workingHours?: Restaurant['workingHours'], closedLabel?: string) {
  if (!workingHours?.length) return null;
  const today = (new Date().getDay() + 6) % 7;
  const wh = workingHours.find((h) => h.dayOfWeek === today);
  if (!wh || wh.isClosed) return closedLabel || 'Closed';
  return `${wh.openTime?.slice(0, 5)} – ${wh.closeTime?.slice(0, 5)}`;
}

/* ─── Feature chips — compact inline ─── */
const CAT_COLORS: Record<string, { color: string; bg: string }> = {
  occasion:      { color: 'rgba(255,120,60,0.9)', bg: 'rgba(255,92,40,0.1)' },
  atmosphere:    { color: 'rgba(99,179,237,0.9)', bg: 'rgba(99,179,237,0.1)' },
  entertainment: { color: 'rgba(183,121,255,0.9)', bg: 'rgba(183,121,255,0.1)' },
};

function FeatureChips({ features }: { features: Restaurant['features'] }) {
  if (!features?.length) return null;

  const order = ['occasion', 'atmosphere', 'entertainment'];
  const sorted = [...features].sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category));

  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {sorted.map(f => {
        const c = CAT_COLORS[f.category] || CAT_COLORS.atmosphere;
        return (
          <span key={f.slug}
            className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[11px] font-medium"
            style={{ background: c.bg, color: c.color }}>
            {f.icon && <span className="text-[11px] leading-none">{f.icon}</span>}
            {f.name}
          </span>
        );
      })}
    </div>
  );
}

/* ─── Contacts & Social links — inline with meta grid ─── */
function ContactItems({ restaurant }: { restaurant: Restaurant }) {
  const items: Array<{ icon: string; label: string; value: string; url: string }> = [];

  if (restaurant.phone) items.push({ icon: '📞', label: 'Телефон', value: restaurant.phone, url: `tel:${restaurant.phone}` });
  if (restaurant.website) {
    const display = restaurant.website.replace(/^https?:\/\//, '').replace(/\/$/, '');
    items.push({ icon: '🌐', label: 'Сайт', value: display, url: restaurant.website.startsWith('http') ? restaurant.website : `https://${restaurant.website}` });
  }
  if (restaurant.email) items.push({ icon: '✉️', label: 'E-mail', value: restaurant.email, url: `mailto:${restaurant.email}` });

  const socials: Array<{ icon: string; label: string; url: string }> = [];
  if (restaurant.instagram) socials.push({ icon: '📸', label: 'Instagram', url: restaurant.instagram.startsWith('http') ? restaurant.instagram : `https://instagram.com/${restaurant.instagram}` });
  if (restaurant.vk) socials.push({ icon: '💬', label: 'VK', url: restaurant.vk.startsWith('http') ? restaurant.vk : `https://vk.com/${restaurant.vk}` });
  if (restaurant.facebook) socials.push({ icon: '📘', label: 'Facebook', url: restaurant.facebook.startsWith('http') ? restaurant.facebook : `https://facebook.com/${restaurant.facebook}` });
  if (restaurant.youtube) socials.push({ icon: '▶️', label: 'YouTube', url: restaurant.youtube.startsWith('http') ? restaurant.youtube : `https://youtube.com/${restaurant.youtube}` });

  if (!items.length && !socials.length) return null;

  return (
    <>
      {/* Contacts — same style as meta grid */}
      {items.map((c) => (
        <a key={c.label} href={c.url} target={c.url.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
          className="flex items-center gap-2.5 p-2.5 rounded-[12px] border no-underline transition-colors"
          style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--card-border)'; }}>
          <span className="text-[16px]">{c.icon}</span>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--text3)]">{c.label}</div>
            <div className="text-[12px] font-semibold text-[var(--text)] truncate">{c.value}</div>
          </div>
        </a>
      ))}
      {/* Socials — compact row inside one grid cell */}
      {socials.length > 0 && (
        <div className="flex items-center gap-1.5 p-2.5 rounded-[12px] border"
          style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }}>
          {socials.map((s) => (
            <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium no-underline transition-colors"
              style={{ color: 'var(--text2)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text2)'; }}>
              <span className="text-[13px]">{s.icon}</span>
              {s.label}
            </a>
          ))}
        </div>
      )}
    </>
  );
}

export function RestaurantInfoCard({ restaurant }: { restaurant: Restaurant }) {
  const { open: openCalc } = useBudgetStore();
  const { user } = useAuthStore();
  const [claimOpen, setClaimOpen] = useState(false);
  const t = useTranslations('restaurant');
  const isOwnerAccount = user?.role === 'owner' || user?.role === 'admin';
  const isMyRestaurant = isOwnerAccount && restaurant.ownerId && user.id === restaurant.ownerId;

  const location = restaurant.locations?.[0];
  const addressLine = restaurant.address || location?.address;
  const cityName = restaurant.city?.name || location?.city?.name;
  const districtName = location?.district?.name;
  const metroStation = restaurant.metroStation || location?.metroStation;
  const fullAddress = [addressLine, districtName, cityName].filter(Boolean).join(', ');
  const todayHours = getTodayHours(restaurant.workingHours, t('closed'));

  const metaItems = [
    { icon: '📍', label: t('address'), value: fullAddress || undefined },
    ...(metroStation ? [{ icon: '🚇', label: 'Метро', value: metroStation }] : []),
    { icon: '🕐', label: t('schedule'), value: todayHours || t('callToCheck') },
    {
      icon: '💰', label: t('avgBill'),
      value: restaurant.averageBill
        ? `~${restaurant.averageBill.toLocaleString('ru-RU')} ₽`
        : t('notSpecified'),
    },
  ].filter((item) => item.value);

  return (
    <div className="border rounded-[24px] p-6 mb-9 flex gap-7 max-lg:flex-col"
      style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>

      {/* Left — Photo slider */}
      <div className="w-[45%] max-lg:w-full flex-shrink-0 min-h-[380px] max-lg:min-h-[280px]">
        <PhotoSlider photos={restaurant.photos || []} name={restaurant.name} cuisines={restaurant.cuisines} />
      </div>

      {/* Right — Info */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          <h1 className="font-serif text-[38px] font-black text-[var(--text)] tracking-[-0.03em] mb-2 leading-[1.1]">
            {restaurant.name}
          </h1>

          {restaurant.cuisines?.length ? (
            <span className="inline-block text-[12px] font-semibold text-[var(--accent)] px-3 py-1 rounded-full mb-3"
              style={{ background: 'var(--accent-glow)' }}>
              {restaurant.cuisines.map((c) => c.name).join(' • ')}
            </span>
          ) : null}

          {(restaurant.description || restaurant.longDescription || restaurant.shortDescription) && (
            <p className="text-[14px] text-[var(--text2)] leading-[1.7] mb-4">
              {restaurant.description || restaurant.longDescription || restaurant.shortDescription}
            </p>
          )}

          {/* Meta grid + contacts — unified */}
          <div className="grid grid-cols-2 gap-2 max-sm:grid-cols-1">
            {metaItems.map((item) => (
              <div key={item.label}
                className="flex items-center gap-2.5 p-2.5 rounded-[12px] border"
                style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }}>
                <span className="text-[16px]">{item.icon}</span>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--text3)]">{item.label}</div>
                  <div className="text-[12px] font-semibold text-[var(--text)] truncate">{item.value}</div>
                </div>
              </div>
            ))}
            <ContactItems restaurant={restaurant} />
          </div>

          {/* Feature tags — inline */}
          <FeatureChips features={restaurant.features} />
        </div>

        {/* Actions — different for owner vs guest */}
        {isMyRestaurant ? (
          <div className="flex gap-2.5 mt-5">
            <a href="/profile?tab=edit"
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-full text-[13px] font-semibold text-white no-underline transition-all"
              style={{ background: 'var(--teal-dark, #0d9488)', boxShadow: '0 0 20px rgba(57,255,209,0.2)' }}>
              ✏️ Редактировать профиль
            </a>
          </div>
        ) : !isOwnerAccount ? (
          <div className="flex gap-2.5 mt-5">
            <button onClick={openCalc}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-full text-[13px] font-semibold border transition-all"
              style={{ background: 'var(--glass)', color: 'var(--text2)', borderColor: 'var(--glass-border)', backdropFilter: 'blur(8px)' }}>
              🍽️ {t('budgetCalc')}
            </button>
            <button
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-full text-[13px] font-semibold text-white transition-all"
              style={{ background: 'var(--accent)', boxShadow: '0 0 20px var(--accent-glow)' }}>
              {t('book')}
            </button>
          </div>
        ) : null}

        {/* Owner claim */}
        {!isOwnerAccount && (
          <div className="mt-4 px-4 py-3 rounded-2xl border flex items-center justify-between gap-3"
            style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
            <p className="text-[12px] text-[var(--text3)] leading-relaxed">{t('claimTitle')}</p>
            <button onClick={() => setClaimOpen(true)}
              className="flex-shrink-0 px-4 py-2 rounded-full text-[12px] font-semibold border transition-all cursor-pointer"
              style={{ color: 'var(--accent)', borderColor: 'var(--chat-user-border)', background: 'var(--accent-glow)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--chat-user-bg)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent-glow)'; e.currentTarget.style.borderColor = 'var(--chat-user-border)'; }}>
              {t('claimButton')}
            </button>
          </div>
        )}
      </div>

      <AddRestaurantModal open={claimOpen} onClose={() => setClaimOpen(false)} />
    </div>
  );
}
