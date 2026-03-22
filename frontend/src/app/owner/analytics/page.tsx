'use client';

import Link from 'next/link';
import { useOwner } from '@/components/owner/OwnerContext';

const METRICS = [
  { label: 'Просмотры', value: '2,847', change: '+12%', icon: '👁️' },
  { label: 'CTR', value: '4.2%', change: '+0.8%', icon: '🖱️' },
  { label: 'Конверсия', value: '1.8%', change: '+0.3%', icon: '📅' },
  { label: 'Рейтинг', value: '4.3', change: '+0.1', icon: '⭐' },
];

const TRAFFIC = [
  { source: 'Поиск на сайте', pct: 42 },
  { source: 'Прямой заход', pct: 28 },
  { source: 'Каталог', pct: 18 },
  { source: 'Соц. сети', pct: 12 },
];

const FUNNEL = [
  { step: 'Просмотры страницы', value: 2847, pct: 100 },
  { step: 'Просмотр меню', value: 1420, pct: 50 },
  { step: 'Форма бронирования', value: 340, pct: 12 },
  { step: 'Завершённые брони', value: 51, pct: 1.8 },
];

const RECS = [
  { text: 'Добавьте больше фото', desc: 'Карточки с 5+ фото получают на 40% больше просмотров', href: '/owner/photos', icon: '📸', priority: 'high' as const },
  { text: 'Загрузите актуальное меню', desc: 'Конверсия в бронь вырастет в 2.5 раза', href: '/owner/edit', icon: '🍽️', priority: 'high' as const },
  { text: 'Публикуйте акции и новости', desc: '+25% к бронированиям у активных ресторанов', href: '/owner/posts', icon: '📝', priority: 'medium' as const },
  { text: 'Отвечайте на отзывы', desc: 'Повышает доверие и лояльность на 30%', href: '/owner/reviews', icon: '⭐', priority: 'medium' as const },
  { text: 'Проверьте контакты', desc: '15% гостей уходят, если нет телефона', href: '/owner/edit', icon: '📞', priority: 'low' as const },
];

const PRIORITY_STYLE = {
  high: { bg: 'rgba(239,68,68,0.08)', color: '#f87171', border: 'rgba(239,68,68,0.15)', label: 'Важно' },
  medium: { bg: 'rgba(245,158,11,0.08)', color: '#fbbf24', border: 'rgba(245,158,11,0.15)', label: 'Средне' },
  low: { bg: 'rgba(107,114,128,0.08)', color: '#9ca3af', border: 'rgba(107,114,128,0.15)', label: 'Совет' },
};

export default function OwnerAnalyticsPage() {
  const { myRestaurant } = useOwner();
  if (!myRestaurant) return null;

  return (
    <div>
      <h1 className="font-serif text-[22px] font-bold text-[var(--text)] mb-1">Аналитика</h1>
      <p className="text-[12px] text-[var(--text3)] mb-5">Статистика и рекомендации для вашего ресторана</p>

      {/* Demo banner */}
      <div className="rounded-[12px] px-4 py-2.5 mb-6 flex items-center gap-2 text-[12px]"
        style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <span className="text-[15px]">⚠️</span>
        <span style={{ color: '#e6a800' }}><b>Демо-режим.</b> Цифры показаны для примера. Реальная аналитика подключается по мере накопления данных.</span>
      </div>

      {/* Two-column layout: Analytics left, Recommendations right */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* LEFT: Analytics */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
            {METRICS.map(m => (
              <div key={m.label} className="rounded-[14px] border p-4"
                style={{ borderColor: 'var(--card-border)', background: 'var(--bg2)' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[16px]">{m.icon}</span>
                  <span className="text-[11px] font-bold" style={{ color: '#34d399' }}>{m.change}</span>
                </div>
                <div className="text-[20px] font-bold text-[var(--text)]">{m.value}</div>
                <div className="text-[11px] text-[var(--text3)]">{m.label}</div>
              </div>
            ))}
          </div>

          {/* Traffic */}
          <div className="rounded-[14px] border p-4 mb-4" style={{ borderColor: 'var(--card-border)', background: 'var(--bg2)' }}>
            <h3 className="text-[14px] font-semibold text-[var(--text)] mb-3">Источники трафика</h3>
            <div className="space-y-2.5">
              {TRAFFIC.map(t => (
                <div key={t.source}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[12px] text-[var(--text2)]">{t.source}</span>
                    <span className="text-[12px] font-bold text-[var(--text)]">{t.pct}%</span>
                  </div>
                  <div className="rounded-full" style={{ height: 6, background: 'var(--bg3)', overflow: 'hidden' }}>
                    <div className="rounded-full" style={{ height: '100%', width: `${t.pct}%`, background: 'linear-gradient(90deg, var(--accent), #ff8c42)', transition: 'width 0.6s' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Heatmap */}
          <div className="rounded-[14px] border p-4 mb-4" style={{ borderColor: 'var(--card-border)', background: 'var(--bg2)' }}>
            <h3 className="text-[14px] font-semibold text-[var(--text)] mb-3">Активность по дням</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
                <div key={d} className="text-center text-[9px] text-[var(--text3)] pb-0.5">{d}</div>
              ))}
              {Array.from({ length: 28 }, (_, i) => {
                const vals = [0.12, 0.25, 0.4, 0.6, 0.85];
                return <div key={i} className="rounded-[3px]" style={{ aspectRatio: '1', background: `rgba(255,92,40,${vals[i % 5]})` }} />;
              })}
            </div>
          </div>

          {/* Funnel */}
          <div className="rounded-[14px] border p-4" style={{ borderColor: 'var(--card-border)', background: 'var(--bg2)' }}>
            <h3 className="text-[14px] font-semibold text-[var(--text)] mb-3">Воронка конверсии</h3>
            {FUNNEL.map((f, i) => (
              <div key={f.step} className="flex items-center gap-3 py-2" style={{ borderBottom: i < FUNNEL.length - 1 ? '1px solid var(--card-border)' : 'none' }}>
                <div className="w-6 h-6 rounded-full text-[10px] font-bold text-white flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, var(--accent), #ff8c42)' }}>{i + 1}</div>
                <div className="flex-1 text-[12px] text-[var(--text2)]">{f.step}</div>
                <div className="text-[13px] font-bold text-[var(--text)]">{f.value.toLocaleString()}</div>
                <div className="text-[11px] text-[var(--text3)] w-10 text-right">{f.pct}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Recommendations */}
        <div style={{ width: 280, minWidth: 280, flexShrink: 0, position: 'sticky', top: 100 }}>
          <div className="rounded-[16px] border p-5" style={{ background: 'linear-gradient(180deg, rgba(52,211,153,0.05), var(--bg2))', borderColor: 'rgba(52,211,153,0.15)' }}>
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[16px]"
                style={{ background: 'linear-gradient(135deg, #34d399, #06b6d4)' }}>
                💡
              </span>
              <h3 className="text-[15px] font-bold text-[var(--text)]">Рекомендации</h3>
            </div>

            <div className="space-y-2.5">
              {RECS.map((r, i) => {
                const ps = PRIORITY_STYLE[r.priority];
                return (
                  <Link key={i} href={r.href} className="block rounded-[12px] p-3 no-underline transition-all group"
                    style={{ background: 'var(--bg2)', border: '1px solid var(--card-border)' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(52,211,153,0.3)'; e.currentTarget.style.transform = 'translateX(2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.transform = 'none'; }}>
                    <div className="flex items-start gap-2.5">
                      <span className="text-[18px] shrink-0 mt-0.5">{r.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[12px] font-semibold text-[var(--text)]">{r.text}</span>
                        </div>
                        <p className="text-[11px] text-[var(--text3)] leading-snug mb-1.5">{r.desc}</p>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                          style={{ background: ps.bg, color: ps.color, border: `1px solid ${ps.border}` }}>
                          {ps.label}
                        </span>
                      </div>
                      <span className="text-[var(--text3)] text-[14px] shrink-0 mt-1 opacity-40 group-hover:opacity-100 transition-opacity">→</span>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Contact CTA */}
            <div className="mt-5 pt-4 text-center" style={{ borderTop: '1px solid var(--card-border)' }}>
              <p className="text-[12px] text-[var(--text3)] mb-2">
                Есть вопросы или нужна помощь?
              </p>
              <a href="tel:88005555335" className="block text-[16px] font-bold no-underline mb-1.5" style={{ color: 'var(--accent)' }}>
                8 800 555-53-35
              </a>
              <p className="text-[11px] font-semibold italic" style={{ color: 'var(--teal)', lineHeight: 1.4 }}>
                Лучше позвонить, чем гадать —<br />мы поможем всё настроить в раз!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
