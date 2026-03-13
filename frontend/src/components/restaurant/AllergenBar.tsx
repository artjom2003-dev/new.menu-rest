'use client';

import { useAuthStore } from '@/stores/auth.store';

const ALL_ALLERGENS = [
  { slug: 'peanuts', icon: '🥜', name: 'Арахис' },
  { slug: 'gluten', icon: '🌾', name: 'Глютен' },
  { slug: 'milk', icon: '🥛', name: 'Молоко' },
  { slug: 'eggs', icon: '🥚', name: 'Яйца' },
  { slug: 'fish', icon: '🐟', name: 'Рыба' },
  { slug: 'crustaceans', icon: '🦐', name: 'Ракообразные' },
  { slug: 'soy', icon: '🫘', name: 'Соя' },
  { slug: 'nuts', icon: '🌰', name: 'Орехи' },
];

interface Restaurant {
  name: string;
}

export function AllergenBar({ restaurant }: { restaurant: Restaurant }) {
  const { user } = useAuthStore();

  const userAllergens = user?.allergenProfile?.map((a) => a.slug) || [];

  return (
    <div className="border rounded-[20px] px-6 py-5 mb-8 flex items-center gap-5 flex-wrap"
      style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }}>
      <div className="flex-1 min-w-[200px]">
        <h3 className="text-[15px] font-semibold text-[var(--text)] mb-0.5">
          Ваш профиль аллергика
        </h3>
        <p className="text-[12px] text-[var(--text3)]">
          {user ? 'Опасные блюда помечены красным' : 'Войдите, чтобы видеть свои аллергены'}
        </p>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {ALL_ALLERGENS.map((allergen) => {
          const isDanger = userAllergens.includes(allergen.slug);
          const isSafe = user && !isDanger;

          return (
            <div
              key={allergen.slug}
              title={allergen.name}
              className="w-10 h-10 rounded-[11px] flex items-center justify-center text-[17px] cursor-pointer transition-all duration-200 relative"
              style={{
                border: isDanger
                  ? '1.5px solid rgba(255,70,70,0.4)'
                  : isSafe
                  ? '1.5px solid rgba(57,255,209,0.3)'
                  : '1.5px solid var(--card-border)',
                background: isDanger
                  ? 'rgba(255,70,70,0.08)'
                  : isSafe
                  ? 'var(--teal-glow)'
                  : 'var(--card)',
              }}>
              {allergen.icon}
              {(isDanger || isSafe) && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border-2"
                  style={{
                    background: isDanger ? '#FF4646' : 'var(--teal)',
                    borderColor: 'var(--bg3)',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
