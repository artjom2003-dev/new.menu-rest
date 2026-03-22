'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBudgetStore, BudgetItem, MenuCategory } from '@/stores/budget.store';
import { ReferralModal } from '@/components/ui/ReferralModal';
import { useAuthStore } from '@/stores/auth.store';

/* ── Emoji helper (same as DishCard) ── */
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

/* ── Category classification ── */
type MealRole = 'salad' | 'soup' | 'main' | 'dessert' | 'drink' | 'other';

const ROLE_KEYWORDS: Record<MealRole, string[]> = {
  salad: ['салат', 'закуск', 'аппетайзер', 'стартер', 'холодн', 'антипаст'],
  soup: ['суп', 'борщ', 'солянк', 'бульон', 'крем-суп', 'похлёбк', 'уха'],
  main: ['горяч', 'основн', 'мяс', 'рыб', 'птиц', 'гриль', 'стейк', 'паста', 'пицца', 'wok', 'вок', 'бургер', 'гарнир'],
  dessert: ['десерт', 'сладк', 'выпечк', 'торт', 'пирож', 'мороженое'],
  drink: ['напит', 'бар', 'вин', 'коктейл', 'пиво', 'чай', 'кофе', 'сок', 'лимонад', 'смузи'],
  other: [],
};

function classifyCategory(name: string): MealRole {
  const lower = name.toLowerCase();
  for (const [role, keywords] of Object.entries(ROLE_KEYWORDS) as [MealRole, string[]][]) {
    if (role === 'other') continue;
    if (keywords.some((kw) => lower.includes(kw))) return role;
  }
  return 'other';
}

/* ── Random pick algorithm ── */

// Budget distribution per role (fraction of total budget for food)
const ROLE_BUDGET_SHARE: Record<MealRole, number> = {
  salad: 0.15,
  soup: 0.10,
  main: 0.45,
  dessert: 0.15,
  drink: 0.15,
  other: 0,
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomPick(categories: MenuCategory[], budgetRub: number, guests: number): BudgetItem[] {
  if (!categories.length || budgetRub <= 0) return [];

  // Account for 10% tips: real food budget = budget / 1.1
  const foodBudgetKop = Math.floor((budgetRub / 1.1) * 100);

  // Classify categories
  const roleMap = new Map<MealRole, MenuCategory[]>();
  for (const cat of categories) {
    const role = classifyCategory(cat.name);
    if (!roleMap.has(role)) roleMap.set(role, []);
    roleMap.get(role)!.push(cat);
  }

  // Collect all dishes by role
  const roleDishes = new Map<MealRole, Array<{ name: string; price: number; calories: number; protein: number; fat: number; carbs: number }>>();
  for (const [role, cats] of roleMap) {
    const dishes = cats.flatMap((c) => c.dishes.filter((d) => d.price > 0)).map((d) => ({
      name: d.name,
      price: d.price,
      calories: d.calories ?? 0,
      protein: d.protein ?? 0,
      fat: d.fat ?? 0,
      carbs: d.carbs ?? 0,
    }));
    if (dishes.length) roleDishes.set(role, dishes);
  }

  // If we have 'other' dishes but no main, treat 'other' as 'main'
  if (!roleDishes.has('main') && roleDishes.has('other')) {
    roleDishes.set('main', roleDishes.get('other')!);
    roleDishes.delete('other');
  }

  // Redistribute budget shares for available roles only
  const availableRoles = [...roleDishes.keys()].filter((r) => r !== 'other');
  if (!availableRoles.length) {
    // Fallback: pick from everything
    const allDishes = categories.flatMap((c) => c.dishes.filter((d) => d.price > 0));
    return pickFromPool(allDishes, foodBudgetKop, guests);
  }

  const totalShare = availableRoles.reduce((s, r) => s + (ROLE_BUDGET_SHARE[r] || 0.15), 0);
  const result: BudgetItem[] = [];
  let remainingBudget = foodBudgetKop;

  for (const role of availableRoles) {
    const share = (ROLE_BUDGET_SHARE[role] || 0.15) / totalShare;
    const roleBudget = Math.floor(foodBudgetKop * share);
    const dishes = roleDishes.get(role)!;

    // Pick dishes for this role for N guests
    const count = role === 'main' ? guests : Math.max(1, Math.ceil(guests / 2));
    const picked = pickDishes(dishes, roleBudget, count);
    for (const d of picked) {
      result.push(toBudgetItem(d));
      remainingBudget -= d.price;
    }
  }

  // If leftover budget, try adding one more dish
  if (remainingBudget > 0) {
    const allDishes = categories.flatMap((c) => c.dishes.filter((d) => d.price > 0 && d.price <= remainingBudget));
    if (allDishes.length) {
      const bonus = shuffle(allDishes)[0];
      result.push(toBudgetItem(bonus));
    }
  }

  return result;
}

function pickDishes(
  dishes: Array<{ name: string; price: number; calories?: number; protein?: number; fat?: number; carbs?: number }>,
  budgetKop: number,
  count: number,
) {
  const affordable = dishes.filter((d) => d.price <= budgetKop);
  if (!affordable.length) return [];

  const shuffled = shuffle(affordable);
  const picked: typeof affordable = [];
  let spent = 0;

  for (const dish of shuffled) {
    if (picked.length >= count) break;
    if (spent + dish.price <= budgetKop) {
      picked.push(dish);
      spent += dish.price;
    }
  }

  return picked;
}

function pickFromPool(
  dishes: Array<{ name: string; price: number; calories?: number; protein?: number; fat?: number; carbs?: number }>,
  budgetKop: number,
  guests: number,
): BudgetItem[] {
  const target = guests * 2; // ~2 dishes per person
  const picked = pickDishes(dishes, budgetKop, target);
  return picked.map(toBudgetItem);
}

function toBudgetItem(d: { name: string; price: number; calories?: number; protein?: number; fat?: number; carbs?: number }): BudgetItem {
  return {
    name: d.name,
    icon: getDishEmoji(d.name),
    price: d.price,
    calories: d.calories || 0,
    protein: d.protein || 0,
    fat: d.fat || 0,
    carbs: d.carbs || 0,
  };
}

/* ── Component ── */

export function BudgetCalcPanel() {
  const router = useRouter();
  const {
    isOpen, close, budget, setBudget, guests, setGuests,
    items, addItem, removeItem, clear,
    totalPrice, totalWithTips, totalCalories, remaining,
    restaurantName, restaurantSlug, menuCategories,
  } = useBudgetStore();

  const total = totalPrice();
  const withTips = totalWithTips();
  const rem = remaining();
  const pct = budget > 0 ? Math.min((withTips / budget) * 100, 100) : 0;
  const barColor = pct > 100 ? '#FF4646' : pct > 80 ? 'var(--gold)' : 'var(--teal)';

  const hasMenu = menuCategories.length > 0;

  const handleRandomPick = useCallback(() => {
    clear();
    const picked = randomPick(menuCategories, budget, guests);
    for (const item of picked) addItem(item);
  }, [menuCategories, budget, guests, clear, addItem]);

  const [showShareModal, setShowShareModal] = useState(false);
  const { user } = useAuthStore();

  const shareDinnerText = (() => {
    const header = restaurantName ? `🍽️ План ужина — ${restaurantName}` : '🍽️ План ужина';
    return `${header} (${guests} чел.)\n\n${items.map((i) => `${i.icon} ${i.name} — ${Math.round(i.price / 100).toLocaleString()} ₽`).join('\n')}\n\n💰 Итого с чаевыми: ${withTips.toLocaleString()} ₽`;
  })();

  const handleShare = () => {
    if (user?.referralCode) {
      setShowShareModal(true);
    } else if (navigator.share) {
      navigator.share({ title: 'План ужина', text: shareDinnerText });
    } else {
      navigator.clipboard.writeText(shareDinnerText);
    }
  };

  return (
    <div
      className="fixed right-0 top-[72px] bottom-0 w-[380px] flex flex-col z-[900] transition-transform duration-[450ms] max-sm:w-full"
      style={{
        background: 'var(--bg2)',
        borderLeft: '1px solid var(--card-border)',
        boxShadow: '-20px 0 80px rgba(0,0,0,0.3)',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
      }}>

      {/* Header */}
      <div className="px-6 py-[22px] flex justify-between items-center sticky top-0 z-[2] border-b"
        style={{ background: 'var(--bg2)', borderColor: 'rgba(255,255,255,0.05)' }}>
        <div>
          <h3 className="font-serif text-[20px] font-bold text-[var(--text)]">🍽️ Хватит на ужин?</h3>
          {restaurantName && (
            <p className="text-[11px] text-[var(--text3)] mt-0.5 truncate max-w-[240px]">
              {restaurantName}
            </p>
          )}
        </div>
        <button
          onClick={close}
          className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[14px] text-[var(--text3)] cursor-pointer transition-all border"
          style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,70,70,0.1)';
            (e.currentTarget as HTMLElement).style.color = '#FF4646';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = '';
            (e.currentTarget as HTMLElement).style.color = '';
          }}>
          ✕
        </button>
      </div>

      {/* Budget + guests */}
      <div className="px-6 py-[18px] border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="flex gap-3 mb-3">
          {/* Budget */}
          <div className="flex-1">
            <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text3)] block mb-1.5">
              Бюджет
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="flex-1 px-3 py-2.5 rounded-[10px] text-[18px] font-bold font-sans text-[var(--text)] outline-none transition-all border w-full"
                style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '')}
              />
              <span className="text-[14px] font-semibold text-[var(--text3)]">₽</span>
            </div>
          </div>

          {/* Guests */}
          <div style={{ width: 100 }}>
            <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text3)] block mb-1.5">
              Гостей
            </label>
            <div className="flex items-center gap-0">
              <button
                onClick={() => setGuests(guests - 1)}
                className="w-[32px] h-[42px] flex items-center justify-center rounded-l-[10px] text-[16px] font-bold cursor-pointer border border-r-0 transition-colors"
                style={{ background: 'var(--bg3)', color: 'var(--text3)', borderColor: 'var(--card-border)', fontFamily: 'inherit' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text3)')}>
                −
              </button>
              <div className="w-[36px] h-[42px] flex items-center justify-center text-[18px] font-bold text-[var(--text)] border-y"
                style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }}>
                {guests}
              </div>
              <button
                onClick={() => setGuests(guests + 1)}
                className="w-[32px] h-[42px] flex items-center justify-center rounded-r-[10px] text-[16px] font-bold cursor-pointer border border-l-0 transition-colors"
                style={{ background: 'var(--bg3)', color: 'var(--text3)', borderColor: 'var(--card-border)', fontFamily: 'inherit' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text3)')}>
                +
              </button>
            </div>
          </div>
        </div>

        {/* Random pick button */}
        {hasMenu && (
          <button
            onClick={handleRandomPick}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-[12px] font-semibold cursor-pointer border-none transition-all duration-300 mb-3"
            style={{
              background: 'linear-gradient(135deg, rgba(186,255,57,0.1), rgba(57,255,209,0.08))',
              color: 'var(--teal)',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, rgba(186,255,57,0.18), rgba(57,255,209,0.14))';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, rgba(186,255,57,0.1), rgba(57,255,209,0.08))';
              (e.currentTarget as HTMLElement).style.transform = 'none';
            }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M1 3h3l2 8h6l2-5H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="8" cy="14" r="1" fill="currentColor" />
              <circle cx="12" cy="14" r="1" fill="currentColor" />
            </svg>
            Подобрать случайно на {guests} чел.
          </button>
        )}

        {/* Progress bar */}
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg3)' }}>
          <div
            className="h-full rounded-full transition-all duration-[600ms]"
            style={{ width: `${pct}%`, background: barColor }}
          />
        </div>

        <div className="text-[11px] text-[var(--text3)] mt-1.5 font-mono">
          {!items.length ? (
            hasMenu ? 'Нажмите «Подобрать» или добавьте блюда вручную' : 'Добавьте блюда из меню'
          ) : rem >= 0 ? (
            <>Осталось: <span style={{ color: 'var(--teal)', fontWeight: 600 }}>{rem.toLocaleString()} ₽</span></>
          ) : (
            <>Превышение: <span style={{ color: '#FF4646', fontWeight: 600 }}>{Math.abs(rem).toLocaleString()} ₽</span></>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 px-6 py-3.5 overflow-y-auto">
        {!items.length ? (
          <div className="text-center py-10 text-[var(--text3)] text-[13px]">
            <span className="text-[44px] mb-3.5 block opacity-40">🍽️</span>
            {hasMenu ? (
              <>Нажмите «Подобрать случайно»<br />или добавьте блюда кнопкой «+»</>
            ) : (
              <>Откройте ресторан и нажмите «+»<br />на блюдах, чтобы собрать ужин</>
            )}
          </div>
        ) : (
          items.map((item, i) => (
            <div key={i} className="flex items-center gap-2.5 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              <span className="text-[22px] w-8 text-center">{item.icon}</span>
              <div className="flex-1">
                <div className="text-[13px] font-medium text-[var(--text)]">{item.name}</div>
                <div className="text-[10px] text-[var(--text3)]">{item.calories} ккал</div>
              </div>
              <span className="text-[13px] font-semibold text-[var(--text)] font-mono">
                {Math.round(item.price / 100).toLocaleString()} ₽
              </span>
              <button
                onClick={() => removeItem(i)}
                className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] text-[var(--text3)] transition-all cursor-pointer border"
                style={{ background: 'transparent', borderColor: 'var(--card-border)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,70,70,0.1)';
                  (e.currentTarget as HTMLElement).style.color = '#FF4646';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = '';
                  (e.currentTarget as HTMLElement).style.color = '';
                }}>
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-5 border-t" style={{ background: 'var(--bg3)', borderColor: 'rgba(255,255,255,0.06)' }}>
        {items.length > 0 && (
          <div className="flex gap-3.5 justify-center p-3 rounded-[10px] mb-3.5 border" style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
            {[
              { label: 'ккал', value: totalCalories() },
              { label: 'белки', value: `${items.reduce((s, i) => s + (i.protein || 0), 0)}г` },
              { label: 'жиры', value: `${items.reduce((s, i) => s + (i.fat || 0), 0)}г` },
              { label: 'углев.', value: `${items.reduce((s, i) => s + (i.carbs || 0), 0)}г` },
            ].map((k) => (
              <div key={k.label} className="text-center text-[9px] text-[var(--text3)] uppercase">
                <span className="block text-[16px] font-bold text-[var(--text)] font-mono">{k.value}</span>
                {k.label}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-1.5 mb-3.5">
          <div className="flex justify-between text-[12px] text-[var(--text3)]">
            <span>Блюда ({items.length} шт.)</span><span>{total.toLocaleString()} ₽</span>
          </div>
          <div className="flex justify-between text-[12px] text-[var(--text3)]">
            <span>Чаевые 10%</span><span>{(withTips - total).toLocaleString()} ₽</span>
          </div>
          <div className="flex justify-between text-[18px] font-bold text-[var(--text)] pt-2 border-t" style={{ borderColor: 'var(--card-border)' }}>
            <span>Итого</span><span>{withTips.toLocaleString()} ₽</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center px-4 py-2.5 rounded-full text-[12px] font-semibold border transition-all cursor-pointer"
            style={{ background: 'var(--glass)', color: 'var(--text2)', borderColor: 'var(--glass-border)', backdropFilter: 'blur(8px)' }}>
            Поделиться
          </button>
          <button
            onClick={() => { close(); router.push(restaurantSlug ? `/restaurants/${restaurantSlug}#booking` : '/restaurants'); }}
            className="flex-1 flex items-center justify-center px-4 py-2.5 rounded-full text-[12px] font-semibold text-white transition-all cursor-pointer border-none"
            style={{ background: 'var(--accent)', boxShadow: '0 0 20px var(--accent-glow)' }}>
            Забронировать
          </button>
        </div>
      </div>

      <ReferralModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        variant="dinner"
        dinnerText={shareDinnerText}
      />
    </div>
  );
}
