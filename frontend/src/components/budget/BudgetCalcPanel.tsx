'use client';

import { useRouter } from 'next/navigation';
import { useBudgetStore } from '@/stores/budget.store';

export function BudgetCalcPanel() {
  const router = useRouter();
  const {
    isOpen, close, budget, setBudget, items, removeItem,
    totalPrice, totalWithTips, totalCalories, remaining,
  } = useBudgetStore();

  const total = totalPrice();
  const withTips = totalWithTips();
  const rem = remaining();
  const pct = budget > 0 ? Math.min((withTips / budget) * 100, 100) : 0;

  const barColor = pct > 100 ? '#FF4646' : pct > 80 ? 'var(--gold)' : 'var(--teal)';

  const handleShare = () => {
    const text = `🍽️ План ужина\n\n${items.map((i) => `${i.icon} ${i.name} — ${Math.round(i.price / 100).toLocaleString()} ₽`).join('\n')}\n\n💰 Итого: ${withTips.toLocaleString()} ₽`;
    if (navigator.share) {
      navigator.share({ title: 'План ужина', text });
    } else {
      navigator.clipboard.writeText(text);
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
        <h3 className="font-serif text-[20px] font-bold text-[var(--text)]">🍽️ Хватит на ужин?</h3>
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

      {/* Budget input */}
      <div className="px-6 py-[18px] border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text3)] block mb-1.5">
          Бюджет на вечер
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="flex-1 px-4 py-3 rounded-[10px] text-[20px] font-bold font-sans text-[var(--text)] outline-none transition-all border"
            style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '')}
          />
          <span className="text-[16px] font-semibold text-[var(--text3)]">₽</span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full mt-3 overflow-hidden" style={{ background: 'var(--bg3)' }}>
          <div
            className="h-full rounded-full transition-all duration-[600ms]"
            style={{ width: `${pct}%`, background: barColor }}
          />
        </div>

        <div className="text-[11px] text-[var(--text3)] mt-1.5 font-mono">
          {!items.length ? (
            'Добавьте блюда из меню'
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
            Нажмите «+» на блюдах<br />чтобы собрать ужин
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
            <span>Блюда</span><span>{total.toLocaleString()} ₽</span>
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
            onClick={() => { close(); router.push('/restaurants'); }}
            className="flex-1 flex items-center justify-center px-4 py-2.5 rounded-full text-[12px] font-semibold text-white transition-all cursor-pointer border-none"
            style={{ background: 'var(--accent)', boxShadow: '0 0 20px var(--accent-glow)' }}>
            Забронировать
          </button>
        </div>
      </div>
    </div>
  );
}
