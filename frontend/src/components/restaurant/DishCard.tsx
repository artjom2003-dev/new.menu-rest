'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useAuthStore } from '@/stores/auth.store';
import { useBudgetStore } from '@/stores/budget.store';
import { useTranslations } from 'next-intl';

interface Dish {
  id: number;
  name: string;
  description?: string;
  composition?: string;
  price: number;
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  weightGrams?: number;
  volumeMl?: number;
  imageUrl?: string;
  isHealthyChoice?: boolean;
  allergens?: Array<{ slug: string; icon: string; name: string }>;
}

const DISH_EMOJIS: Record<string, string> = {
  стейк: '🥩', рибай: '🥩', паста: '🍝', карбонара: '🍝',
  пицца: '🍕', суши: '🍣', ролл: '🍱', салат: '🥗',
  суп: '🍲', борщ: '🍲', десерт: '🍰', тирамису: '🍰',
  вино: '🍷', коктейль: '🍸', кофе: '☕', чай: '🍵',
  осьминог: '🐙', краб: '🦀', лосось: '🐟', тунец: '🐟',
};

function getDishEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(DISH_EMOJIS)) {
    if (lower.includes(key)) return emoji;
  }
  return '🍽️';
}

export function DishCard({ dish }: { dish: Dish }) {
  const t = useTranslations('dish');
  const { user } = useAuthStore();
  const { addItem, open } = useBudgetStore();
  const [imgError, setImgError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const userAllergenSlugs = user?.allergenProfile?.map((a) => a.slug) || [];
  const priceRub = dish.price;
  const hasImage = dish.imageUrl && /^https?:\/\//.test(dish.imageUrl) && !imgError;
  const isNum = (v: unknown): v is number => typeof v === 'number' && v > 0 && isFinite(v);
  const hasKbzhu = isNum(dish.calories) || isNum(dish.protein) || isNum(dish.fat) || isNum(dish.carbs);
  const hasDetails = dish.composition || (hasKbzhu && dish.composition);

  const handleAdd = () => {
    addItem({
      name: dish.name,
      icon: getDishEmoji(dish.name),
      price: dish.price,
      calories: dish.calories || 0,
      protein: dish.protein || 0,
      fat: dish.fat || 0,
      carbs: dish.carbs || 0,
    });
    open();
  };

  return (
    <div
      className="flex gap-4 max-sm:gap-3 p-[18px] max-sm:p-3 border rounded-[16px] cursor-pointer relative overflow-hidden group transition-all duration-[350ms]"
      style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}
      onClick={() => hasDetails && setExpanded(!expanded)}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--chat-user-border)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--card-border)';
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = 'none';
      }}>

      {/* Hover gradient */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-[400ms]"
        style={{ background: 'linear-gradient(135deg, var(--accent-glow), transparent)' }} />

      {/* Image / Emoji thumb */}
      <div className="w-[90px] h-[90px] max-sm:w-[70px] max-sm:h-[70px] rounded-[12px] flex-shrink-0 relative z-10 overflow-hidden"
        style={{ background: 'var(--bg3)' }}>
        {hasImage ? (
          <Image src={dish.imageUrl!} alt={dish.name} fill sizes="90px" quality={85} className="object-cover"
            onError={() => setImgError(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[36px]">
            {getDishEmoji(dish.name)}
          </div>
        )}
        {/* Healthy badge */}
        {dish.isHealthyChoice && (
          <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
            style={{ background: 'rgba(57,255,100,0.2)', color: '#4ade80', backdropFilter: 'blur(4px)' }}>
            🌿 {t('healthy')}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 relative z-10 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="text-[14px] max-sm:text-[13px] font-semibold text-[var(--text)] mb-0.5">{dish.name}</div>
          {(dish.weightGrams || dish.volumeMl) && (
            <span className="text-[10px] text-[var(--text3)] flex-shrink-0 whitespace-nowrap mt-0.5">
              {dish.weightGrams ? `${dish.weightGrams} ${t('gram')}` : `${dish.volumeMl} ${t('ml')}`}
            </span>
          )}
        </div>

        {dish.description && (
          <div className="text-[11px] text-[var(--text3)] leading-[1.5] mb-1.5 overflow-hidden"
            style={{ display: '-webkit-box', WebkitLineClamp: expanded ? 10 : 2, WebkitBoxOrient: 'vertical' }}>
            {dish.description}
          </div>
        )}

        {/* Composition — expanded */}
        {expanded && dish.composition && (
          <div className="text-[11px] text-[var(--text3)] leading-[1.5] mb-2 px-2.5 py-2 rounded-lg border"
            style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}>
            <span className="text-[10px] uppercase tracking-wider text-[var(--text3)] opacity-60">{t('composition')}: </span>
            {dish.composition}
          </div>
        )}

        {/* Allergens */}
        {dish.allergens && dish.allergens.length > 0 && (
          <div className="flex gap-0.5 mb-1.5 flex-wrap">
            {dish.allergens.map((a) => {
              const isDanger = userAllergenSlugs.includes(a.slug);
              return (
                <span key={a.slug} title={a.name}
                  className="h-5 px-1.5 rounded-[5px] text-[9px] flex items-center justify-center gap-0.5 border"
                  style={{
                    border: isDanger ? '1px solid rgba(255,70,70,0.4)' : '1px solid var(--card-border)',
                    background: isDanger ? 'rgba(255,70,70,0.1)' : 'var(--bg3)',
                    color: isDanger ? '#ff6b6b' : 'var(--text3)',
                  }}>
                  {a.icon} {a.name}
                </span>
              );
            })}
          </div>
        )}

        {/* Footer: Price + KBZHU */}
        <div className="flex items-center justify-between mt-1">
          <div className="text-[16px] font-bold text-[var(--text)]">
            {priceRub > 0 ? `${priceRub.toLocaleString()} ₽` : <span className="text-[12px] text-[var(--text3)]">{t('priceOnRequest')}</span>}
          </div>
          {hasKbzhu && (
            <div className="flex gap-2 text-[9px] text-[var(--text3)] font-mono">
              {isNum(dish.calories) ? <span><em className="not-italic text-[11px] font-medium text-[var(--text2)]">{dish.calories}</em> {t('kcal')}</span> : null}
              {isNum(dish.protein) ? <span><em className="not-italic text-[11px] font-medium text-[var(--text2)]">{dish.protein.toFixed(0)}</em>{t('protein')}</span> : null}
              {isNum(dish.fat) ? <span><em className="not-italic text-[11px] font-medium text-[var(--text2)]">{dish.fat.toFixed(0)}</em>{t('fat')}</span> : null}
              {isNum(dish.carbs) ? <span><em className="not-italic text-[11px] font-medium text-[var(--text2)]">{dish.carbs.toFixed(0)}</em>{t('carbs')}</span> : null}
            </div>
          )}
        </div>
      </div>

      {/* Add button */}
      <button
        onClick={(e) => { e.stopPropagation(); handleAdd(); }}
        className="absolute bottom-4 right-4 max-sm:bottom-3 max-sm:right-3 z-10 w-[34px] h-[34px] max-sm:w-9 max-sm:h-9 rounded-full text-white text-[18px] flex items-center justify-center border-none transition-all duration-200 cursor-pointer"
        style={{ background: 'var(--accent)', boxShadow: '0 4px 16px var(--accent-glow)' }}
        onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.transform = 'scale(1.15)'}
        onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.transform = ''}>
        +
      </button>
    </div>
  );
}
