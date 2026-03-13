'use client';

import { useAuthStore } from '@/stores/auth.store';
import { useBudgetStore } from '@/stores/budget.store';

interface Dish {
  id: number;
  name: string;
  description?: string;
  price: number; // в копейках
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
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
  const { user } = useAuthStore();
  const { addItem, open } = useBudgetStore();

  const userAllergenSlugs = user?.allergenProfile?.map((a) => a.slug) || [];
  const priceRub = Math.round(dish.price / 100);

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
      className="flex gap-4 p-[18px] border rounded-[16px] cursor-pointer relative overflow-hidden group transition-all duration-[350ms]"
      style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,92,40,0.2)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 16px 48px rgba(0,0,0,0.3)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = '';
        (e.currentTarget as HTMLElement).style.transform = '';
        (e.currentTarget as HTMLElement).style.boxShadow = '';
      }}>

      {/* Hover gradient */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-[400ms]"
        style={{ background: 'linear-gradient(135deg, var(--accent-glow), transparent)' }} />

      {/* Emoji thumb */}
      <div className="w-[90px] h-[90px] rounded-[12px] flex-shrink-0 flex items-center justify-center text-[36px] relative z-10"
        style={{ background: 'var(--bg3)' }}>
        {getDishEmoji(dish.name)}
      </div>

      {/* Content */}
      <div className="flex-1 relative z-10 min-w-0">
        <div className="text-[14px] font-semibold text-[var(--text)] mb-0.5">{dish.name}</div>

        {dish.description && (
          <div className="text-[11px] text-[var(--text3)] leading-[1.5] mb-2 overflow-hidden"
            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {dish.description}
          </div>
        )}

        {/* Allergens */}
        {dish.allergens && dish.allergens.length > 0 && (
          <div className="flex gap-0.5 mb-2">
            {dish.allergens.map((a) => {
              const isDanger = userAllergenSlugs.includes(a.slug);
              return (
                <span
                  key={a.slug}
                  title={a.name}
                  className="w-5 h-5 rounded-[5px] text-[9px] flex items-center justify-center border"
                  style={{
                    border: isDanger ? '1px solid rgba(255,70,70,0.3)' : '1px solid var(--card-border)',
                    background: isDanger ? 'rgba(255,70,70,0.08)' : 'var(--card)',
                  }}>
                  {a.icon}
                </span>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="text-[16px] font-bold text-[var(--text)]">
            {priceRub.toLocaleString()} ₽
          </div>
          {(dish.calories || dish.protein) && (
            <div className="flex gap-2 text-[9px] text-[var(--text3)] font-mono">
              {dish.calories && <span><em className="not-italic text-[11px] font-medium text-[var(--text2)]">{dish.calories}</em> ккал</span>}
              {dish.protein && <span><em className="not-italic text-[11px] font-medium text-[var(--text2)]">{dish.protein}</em>Б</span>}
              {dish.fat && <span><em className="not-italic text-[11px] font-medium text-[var(--text2)]">{dish.fat}</em>Ж</span>}
              {dish.carbs && <span><em className="not-italic text-[11px] font-medium text-[var(--text2)]">{dish.carbs}</em>У</span>}
            </div>
          )}
        </div>
      </div>

      {/* Add button */}
      <button
        onClick={handleAdd}
        className="absolute bottom-4 right-4 z-10 w-[34px] h-[34px] rounded-full text-white text-[18px] flex items-center justify-center border-none transition-all duration-200 cursor-pointer"
        style={{ background: 'var(--accent)', boxShadow: '0 4px 16px rgba(255,92,40,0.3)' }}
        onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.transform = 'scale(1.15)'}
        onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.transform = ''}>
        +
      </button>
    </div>
  );
}
