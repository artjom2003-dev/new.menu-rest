'use client';

import Image from 'next/image';
import { useBudgetStore } from '@/stores/budget.store';

interface Restaurant {
  name: string;
  shortDescription?: string;
  longDescription?: string;
  ratingAggregate: number;
  reviewCount: number;
  averageBillMin?: number;
  averageBillMax?: number;
  priceLevel?: number;
  cuisines?: Array<{ name: string }>;
  features?: Array<{ name: string; slug: string; category: string }>;
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

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function getTodayHours(workingHours?: Restaurant['workingHours']) {
  if (!workingHours?.length) return null;
  const today = (new Date().getDay() + 6) % 7; // 0=Mon
  const wh = workingHours.find((h) => h.dayOfWeek === today);
  if (!wh || wh.isClosed) return 'Закрыто';
  return `${wh.openTime?.slice(0, 5)} – ${wh.closeTime?.slice(0, 5)}`;
}

export function RestaurantInfoCard({ restaurant }: { restaurant: Restaurant }) {
  const { open: openCalc } = useBudgetStore();
  const location = restaurant.locations?.[0];
  const todayHours = getTodayHours(restaurant.workingHours);
  const secondPhoto = restaurant.photos?.filter((p) => !p.isCover)[0];

  const metaItems = [
    { icon: '📍', label: 'Адрес', value: location?.address },
    { icon: '⭐', label: 'Рейтинг', value: `${Number(restaurant.ratingAggregate).toFixed(1)} (${restaurant.reviewCount} отзывов)` },
    { icon: '🕐', label: 'Режим', value: todayHours || 'Уточните по телефону' },
    {
      icon: '💰', label: 'Средний чек',
      value: restaurant.averageBillMin && restaurant.averageBillMax
        ? `${restaurant.averageBillMin.toLocaleString()} – ${restaurant.averageBillMax.toLocaleString()} ₽`
        : 'Не указан',
    },
    {
      icon: '🎯', label: 'Повод',
      value: restaurant.features?.filter((f) => f.category === 'occasion').map((f) => f.name).join(', ') || '—',
    },
    {
      icon: '✨', label: 'Атмосфера',
      value: restaurant.features?.filter((f) => f.category === 'atmosphere').map((f) => f.name).join(', ') || '—',
    },
  ].filter((item) => item.value);

  return (
    <div className="border rounded-[24px] p-9 mb-9 grid grid-cols-2 gap-9 max-lg:grid-cols-1"
      style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>

      {/* Left */}
      <div>
        <h1 className="font-serif text-[42px] font-black text-[var(--text)] tracking-[-0.03em] mb-2">
          {restaurant.name}
        </h1>

        {restaurant.cuisines?.length && (
          <span className="inline-block text-[12px] font-semibold text-[var(--accent)] px-3 py-1 rounded-full mb-3.5"
            style={{ background: 'var(--accent-glow)' }}>
            {restaurant.cuisines.map((c) => c.name).join(' • ')}
          </span>
        )}

        {restaurant.longDescription || restaurant.shortDescription ? (
          <p className="text-[14px] text-[var(--text2)] leading-[1.7] mb-5">
            {restaurant.longDescription || restaurant.shortDescription}
          </p>
        ) : null}

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {metaItems.map((item) => (
            <div key={item.label}
              className="flex items-center gap-2.5 p-3 rounded-[12px] border"
              style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }}>
              <span className="text-[18px]">{item.icon}</span>
              <div>
                <div className="text-[10px] uppercase tracking-[0.08em] text-[var(--text3)]">{item.label}</div>
                <div className="text-[13px] font-semibold text-[var(--text)]">{item.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right */}
      <div className="flex flex-col gap-3.5">
        {secondPhoto && (
          <div className="flex-1 rounded-[16px] overflow-hidden relative min-h-[200px]">
            <Image src={secondPhoto.url} alt={restaurant.name} fill className="object-cover" />
          </div>
        )}
        <div className="flex gap-2.5">
          <button
            onClick={openCalc}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-full text-[13px] font-semibold border transition-all"
            style={{ background: 'var(--glass)', color: 'var(--text2)', borderColor: 'var(--glass-border)', backdropFilter: 'blur(8px)' }}>
            🍽️ Хватит на ужин?
          </button>
          <button
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-full text-[13px] font-semibold text-white transition-all"
            style={{ background: 'var(--accent)', boxShadow: '0 0 20px var(--accent-glow)' }}>
            Забронировать
          </button>
        </div>
      </div>
    </div>
  );
}
