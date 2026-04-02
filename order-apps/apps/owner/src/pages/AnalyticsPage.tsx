import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useRestaurantStore } from '../stores/restaurantStore';

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

const DAILY_VIEWS = [
  { day: 'Пн', views: 142 }, { day: 'Вт', views: 168 }, { day: 'Ср', views: 195 },
  { day: 'Чт', views: 183 }, { day: 'Пт', views: 267 }, { day: 'Сб', views: 312 },
  { day: 'Вс', views: 245 }, { day: 'Пн', views: 156 }, { day: 'Вт', views: 178 },
  { day: 'Ср', views: 201 }, { day: 'Чт', views: 190 }, { day: 'Пт', views: 289 },
  { day: 'Сб', views: 298 }, { day: 'Вс', views: 223 },
];

const PEAK_HOURS = [
  { time: '10:00', pct: 12 },
  { time: '12:00', pct: 45 },
  { time: '14:00', pct: 35 },
  { time: '16:00', pct: 20 },
  { time: '18:00', pct: 68 },
  { time: '20:00', pct: 92 },
  { time: '22:00', pct: 55 },
];

const RECS = [
  { text: 'Добавьте больше фото', desc: 'Карточки с 5+ фото получают на 40% больше просмотров', href: '/edit', icon: '📸', priority: 'high' as const },
  { text: 'Загрузите актуальное меню', desc: 'Конверсия в бронь вырастет в 2.5 раза', href: '/edit', icon: '🍽️', priority: 'high' as const },
  { text: 'Публикуйте акции и новости', desc: '+25% к бронированиям у активных ресторанов', href: '/posts', icon: '📝', priority: 'medium' as const },
  { text: 'Отвечайте на отзывы', desc: 'Повышает доверие и лояльность на 30%', href: '/reviews', icon: '⭐', priority: 'medium' as const },
  { text: 'Проверьте контакты', desc: '15% гостей уходят, если нет телефона', href: '/edit', icon: '📞', priority: 'low' as const },
];

const PRIORITY_STYLE = {
  high: { bg: 'rgba(239,68,68,0.08)', color: '#f87171', border: 'rgba(239,68,68,0.15)', label: 'Важно' },
  medium: { bg: 'rgba(245,158,11,0.08)', color: '#fbbf24', border: 'rgba(245,158,11,0.15)', label: 'Средне' },
  low: { bg: 'rgba(107,114,128,0.08)', color: '#9ca3af', border: 'rgba(107,114,128,0.15)', label: 'Совет' },
};

function ConsumerPortraitModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  const traits = [
    { icon: '👤', label: 'Возраст', value: '25–38 лет' },
    { icon: '⚤', label: 'Пол', value: '58% женщины, 42% мужчины' },
    { icon: '💼', label: 'Статус', value: 'Работающие специалисты' },
    { icon: '💳', label: 'Средний чек', value: '1 200 – 1 800 ₽' },
  ];

  const behavior = [
    { icon: '🕐', label: 'Пиковое время', value: 'Пт-Сб, 19:00–21:00' },
    { icon: '📱', label: 'Устройство', value: '72% мобильные' },
    { icon: '🔄', label: 'Повторные визиты', value: '34% возвращаются' },
    { icon: '📍', label: 'Радиус', value: 'В среднем 3.2 км от дома' },
  ];

  const topDishes = [
    { name: 'Паста карбонара', pct: 78 },
    { name: 'Цезарь с курицей', pct: 65 },
    { name: 'Том ям', pct: 52 },
    { name: 'Чизкейк', pct: 44 },
    { name: 'Латте', pct: 41 },
  ];

  const motivations = [
    { emoji: '🍽️', text: 'Вкусно поесть', pct: 45 },
    { emoji: '👫', text: 'Встреча с друзьями', pct: 28 },
    { emoji: '💑', text: 'Романтический ужин', pct: 15 },
    { emoji: '💼', text: 'Деловая встреча', pct: 12 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }} />
      <div className="relative w-full max-w-[560px] max-h-[90vh] overflow-y-auto rounded-[20px] border"
        style={{ background: '#12121E', borderColor: '#2A2A44' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="relative px-6 pt-6 pb-4" style={{ background: 'linear-gradient(135deg, rgba(255,92,40,0.08), rgba(139,92,246,0.08))' }}>
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-[14px] hover:text-[#EAEAEA] transition-colors"
            style={{ background: '#16162A', border: '1px solid #2A2A44', color: '#6C6C88' }}>✕</button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-[32px]"
              style={{ background: 'linear-gradient(135deg, rgba(255,92,40,0.15), rgba(139,92,246,0.15))', border: '2px solid rgba(255,92,40,0.2)' }}>
              🧑
            </div>
            <div>
              <h2 className="text-[18px] font-bold" style={{ color: '#EAEAEA' }}>Портрет потребителя</h2>
              <p className="text-[12px] mt-0.5" style={{ color: '#6C6C88' }}>Типичный гость вашего ресторана</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Demographics */}
          <div>
            <h3 className="text-[13px] font-semibold mb-3 flex items-center gap-2" style={{ color: '#A0A0B8' }}>
              <span className="w-5 h-5 rounded-[6px] flex items-center justify-center text-[11px]"
                style={{ background: 'rgba(255,92,40,0.1)' }}>👤</span>
              Демография
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              {traits.map(t => (
                <div key={t.label} className="rounded-[10px] px-3 py-2.5 border" style={{ background: '#16162A', borderColor: '#2A2A44' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[14px]">{t.icon}</span>
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: '#6C6C88' }}>{t.label}</span>
                  </div>
                  <span className="text-[13px] font-semibold" style={{ color: '#EAEAEA' }}>{t.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Behavior */}
          <div>
            <h3 className="text-[13px] font-semibold mb-3 flex items-center gap-2" style={{ color: '#A0A0B8' }}>
              <span className="w-5 h-5 rounded-[6px] flex items-center justify-center text-[11px]"
                style={{ background: 'rgba(139,92,246,0.1)' }}>📊</span>
              Поведение
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              {behavior.map(b => (
                <div key={b.label} className="rounded-[10px] px-3 py-2.5 border" style={{ background: '#16162A', borderColor: '#2A2A44' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[14px]">{b.icon}</span>
                    <span className="text-[10px] uppercase tracking-wider" style={{ color: '#6C6C88' }}>{b.label}</span>
                  </div>
                  <span className="text-[13px] font-semibold" style={{ color: '#EAEAEA' }}>{b.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top dishes */}
          <div>
            <h3 className="text-[13px] font-semibold mb-3 flex items-center gap-2" style={{ color: '#A0A0B8' }}>
              <span className="w-5 h-5 rounded-[6px] flex items-center justify-center text-[11px]"
                style={{ background: 'rgba(52,211,153,0.1)' }}>🍽️</span>
              Чаще всего заказывают
            </h3>
            <div className="space-y-2">
              {topDishes.map((d, i) => (
                <div key={d.name} className="flex items-center gap-3">
                  <span className="text-[11px] font-bold w-4 text-center" style={{ color: i === 0 ? '#E8491D' : '#6C6C88' }}>{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-[12px]" style={{ color: '#EAEAEA' }}>{d.name}</span>
                      <span className="text-[11px] font-bold" style={{ color: '#A0A0B8' }}>{d.pct}%</span>
                    </div>
                    <div className="rounded-full overflow-hidden" style={{ height: 5, background: '#222236' }}>
                      <div className="h-full rounded-full" style={{
                        width: `${d.pct}%`,
                        background: i === 0 ? 'linear-gradient(90deg, #E8491D, #ff8c42)' : 'rgba(255,92,40,0.35)',
                      }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Motivations */}
          <div>
            <h3 className="text-[13px] font-semibold mb-3 flex items-center gap-2" style={{ color: '#A0A0B8' }}>
              <span className="w-5 h-5 rounded-[6px] flex items-center justify-center text-[11px]"
                style={{ background: 'rgba(245,158,11,0.1)' }}>💡</span>
              Зачем приходят
            </h3>
            <div className="flex gap-2">
              {motivations.map(m => (
                <div key={m.text} className="flex-1 rounded-[10px] p-2.5 text-center border" style={{ background: '#16162A', borderColor: '#2A2A44' }}>
                  <div className="text-[20px] mb-1">{m.emoji}</div>
                  <div className="text-[16px] font-bold" style={{ color: '#EAEAEA' }}>{m.pct}%</div>
                  <div className="text-[9px] mt-0.5 leading-tight" style={{ color: '#6C6C88' }}>{m.text}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  const { restaurant } = useRestaurantStore();
  const [showPortrait, setShowPortrait] = useState(false);
  if (!restaurant) return null;

  return (
    <div>
      <h1 className="font-serif text-[22px] font-bold mb-1" style={{ color: '#EAEAEA' }}>Аналитика</h1>
      <p className="text-[12px] mb-5" style={{ color: '#6C6C88' }}>Статистика и рекомендации для вашего ресторана</p>

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
                style={{ borderColor: '#2A2A44', background: '#16162A' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[16px]">{m.icon}</span>
                  <span className="text-[11px] font-bold" style={{ color: '#34d399' }}>{m.change}</span>
                </div>
                <div className="text-[20px] font-bold" style={{ color: '#EAEAEA' }}>{m.value}</div>
                <div className="text-[11px]" style={{ color: '#6C6C88' }}>{m.label}</div>
              </div>
            ))}
          </div>

          {/* Traffic */}
          <div className="rounded-[14px] border p-4 mb-4" style={{ borderColor: '#2A2A44', background: '#16162A' }}>
            <h3 className="text-[14px] font-semibold mb-3" style={{ color: '#EAEAEA' }}>Источники трафика</h3>
            <div className="space-y-2.5">
              {TRAFFIC.map(t => (
                <div key={t.source}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[12px]" style={{ color: '#A0A0B8' }}>{t.source}</span>
                    <span className="text-[12px] font-bold" style={{ color: '#EAEAEA' }}>{t.pct}%</span>
                  </div>
                  <div className="rounded-full" style={{ height: 6, background: '#222236', overflow: 'hidden' }}>
                    <div className="rounded-full" style={{ height: '100%', width: `${t.pct}%`, background: 'linear-gradient(90deg, #E8491D, #ff8c42)', transition: 'width 0.6s' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Views chart - last 14 days */}
          <div className="rounded-[14px] border p-4 mb-4" style={{ borderColor: '#2A2A44', background: '#16162A' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-semibold" style={{ color: '#EAEAEA' }}>Просмотры за 14 дней</h3>
              <span className="text-[11px]" style={{ color: '#6C6C88' }}>всего: 2 847</span>
            </div>
            <div className="flex items-end gap-[3px]" style={{ height: 120, paddingTop: 20 }}>
              {DAILY_VIEWS.map((v, i) => {
                const maxV = Math.max(...DAILY_VIEWS.map(d => d.views));
                const pct = Math.max(6, (v.views / maxV) * 100);
                const isWeekend = [5, 6, 12, 13].includes(i);
                return (
                  <div key={i} className="flex-1 group relative cursor-pointer" style={{ height: '100%', display: 'flex', alignItems: 'flex-end' }}>
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10"
                      style={{ background: '#E8491D' }}>
                      {v.views}
                    </div>
                    <div className="w-full rounded-t-[4px] transition-all duration-300 group-hover:brightness-125"
                      style={{
                        height: `${pct}%`,
                        minHeight: 4,
                        background: isWeekend
                          ? 'linear-gradient(180deg, #ff8c42, #E8491D)'
                          : 'linear-gradient(180deg, rgba(255,92,40,0.6), rgba(255,92,40,0.25))',
                      }} />
                  </div>
                );
              })}
            </div>
            <div className="flex gap-[3px] mt-1">
              {DAILY_VIEWS.map((v, i) => (
                <div key={i} className="flex-1 text-center text-[8px]" style={{ color: '#6C6C88' }}>{v.day}</div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-2.5 pt-2" style={{ borderTop: '1px solid #2A2A44' }}>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-[2px]" style={{ background: 'linear-gradient(180deg, #ff8c42, #E8491D)' }} />
                <span className="text-[10px]" style={{ color: '#6C6C88' }}>Выходные</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-[2px]" style={{ background: 'rgba(255,92,40,0.4)' }} />
                <span className="text-[10px]" style={{ color: '#6C6C88' }}>Будни</span>
              </div>
            </div>
          </div>

          {/* Popular hours */}
          <div className="rounded-[14px] border p-4 mb-4" style={{ borderColor: '#2A2A44', background: '#16162A' }}>
            <h3 className="text-[14px] font-semibold mb-3" style={{ color: '#EAEAEA' }}>Когда вас ищут</h3>
            <div className="space-y-2">
              {PEAK_HOURS.map(h => (
                <div key={h.time} className="flex items-center gap-3">
                  <span className="text-[11px] w-12 shrink-0" style={{ color: '#6C6C88' }}>{h.time}</span>
                  <div className="flex-1 rounded-full overflow-hidden" style={{ height: 8, background: '#222236' }}>
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${h.pct}%`,
                      background: h.pct > 60
                        ? 'linear-gradient(90deg, #E8491D, #ff8c42)'
                        : h.pct > 30
                          ? 'linear-gradient(90deg, rgba(255,92,40,0.5), rgba(255,140,66,0.5))'
                          : 'rgba(255,92,40,0.25)',
                    }} />
                  </div>
                  <span className="text-[11px] font-semibold w-8 text-right" style={{ color: '#EAEAEA' }}>{h.pct}%</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] mt-3 italic" style={{ color: '#6C6C88' }}>
              Пик активности — вечером в пятницу и субботу. Публикуйте акции за 2-3 часа до пика.
            </p>
          </div>

          {/* Funnel */}
          <div className="rounded-[14px] border p-4" style={{ borderColor: '#2A2A44', background: '#16162A' }}>
            <h3 className="text-[14px] font-semibold mb-3" style={{ color: '#EAEAEA' }}>Воронка конверсии</h3>
            {FUNNEL.map((f, i) => (
              <div key={f.step} className="flex items-center gap-3 py-2" style={{ borderBottom: i < FUNNEL.length - 1 ? '1px solid #2A2A44' : 'none' }}>
                <div className="w-6 h-6 rounded-full text-[10px] font-bold text-white flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, #E8491D, #ff8c42)' }}>{i + 1}</div>
                <div className="flex-1 text-[12px]" style={{ color: '#A0A0B8' }}>{f.step}</div>
                <div className="text-[13px] font-bold" style={{ color: '#EAEAEA' }}>{f.value.toLocaleString()}</div>
                <div className="text-[11px] w-10 text-right" style={{ color: '#6C6C88' }}>{f.pct}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Portrait + Recommendations */}
        <div style={{ width: 280, minWidth: 280, flexShrink: 0, position: 'sticky', top: 100 }}>
          {/* Consumer Portrait */}
          <div className="rounded-[16px] border p-5 mb-4" style={{ background: 'linear-gradient(180deg, rgba(139,92,246,0.05), #16162A)', borderColor: 'rgba(139,92,246,0.15)' }}>
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[16px]"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #E8491D)' }}>
                🧑
              </span>
              <h3 className="text-[15px] font-bold" style={{ color: '#EAEAEA' }}>Портрет гостя</h3>
            </div>

            <div className="space-y-2">
              {[
                { icon: '👤', label: 'Возраст', value: '25–38 лет' },
                { icon: '⚤', label: 'Пол', value: '58% ж / 42% м' },
                { icon: '💳', label: 'Ср. чек', value: '1 200–1 800 ₽' },
                { icon: '🕐', label: 'Пик', value: 'Пт-Сб, 19–21:00' },
                { icon: '📱', label: 'Устройства', value: '72% мобильные' },
                { icon: '🔄', label: 'Возвращаются', value: '34%' },
              ].map(t => (
                <div key={t.label} className="flex items-center gap-2.5 py-1.5" style={{ borderBottom: '1px solid #2A2A44' }}>
                  <span className="text-[13px] shrink-0">{t.icon}</span>
                  <span className="text-[10px] flex-1" style={{ color: '#6C6C88' }}>{t.label}</span>
                  <span className="text-[11px] font-semibold" style={{ color: '#EAEAEA' }}>{t.value}</span>
                </div>
              ))}
            </div>

            <div className="mt-3">
              <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: '#6C6C88' }}>Зачем приходят</div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { emoji: '🍽️', text: 'Поесть', pct: 45 },
                  { emoji: '👫', text: 'Друзья', pct: 28 },
                  { emoji: '💑', text: 'Свидание', pct: 15 },
                  { emoji: '💼', text: 'Бизнес', pct: 12 },
                ].map(m => (
                  <div key={m.text} className="rounded-[8px] px-2 py-1.5 text-center" style={{ background: '#222236', flex: '1 1 45%' }}>
                    <div className="text-[13px]">{m.emoji}</div>
                    <div className="text-[11px] font-bold" style={{ color: '#EAEAEA' }}>{m.pct}%</div>
                    <div className="text-[8px]" style={{ color: '#6C6C88' }}>{m.text}</div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowPortrait(true)}
              className="w-full mt-3 py-2 rounded-[10px] text-[11px] font-semibold cursor-pointer transition-all border-none"
              style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.18)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(139,92,246,0.1)'; }}>
              Подробнее →
            </button>
          </div>
          <ConsumerPortraitModal open={showPortrait} onClose={() => setShowPortrait(false)} />

          <div className="rounded-[16px] border p-5" style={{ background: 'linear-gradient(180deg, rgba(52,211,153,0.05), #16162A)', borderColor: 'rgba(52,211,153,0.15)' }}>
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[16px]"
                style={{ background: 'linear-gradient(135deg, #34d399, #06b6d4)' }}>
                💡
              </span>
              <h3 className="text-[15px] font-bold" style={{ color: '#EAEAEA' }}>Рекомендации</h3>
            </div>

            <div className="space-y-2.5">
              {RECS.map((r, i) => {
                const ps = PRIORITY_STYLE[r.priority];
                return (
                  <Link key={i} to={r.href} className="block rounded-[12px] p-3 no-underline transition-all group"
                    style={{ background: '#16162A', border: '1px solid #2A2A44' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(52,211,153,0.3)'; e.currentTarget.style.transform = 'translateX(2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#2A2A44'; e.currentTarget.style.transform = 'none'; }}>
                    <div className="flex items-start gap-2.5">
                      <span className="text-[18px] shrink-0 mt-0.5">{r.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[12px] font-semibold" style={{ color: '#EAEAEA' }}>{r.text}</span>
                        </div>
                        <p className="text-[11px] leading-snug mb-1.5" style={{ color: '#6C6C88' }}>{r.desc}</p>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                          style={{ background: ps.bg, color: ps.color, border: `1px solid ${ps.border}` }}>
                          {ps.label}
                        </span>
                      </div>
                      <span className="text-[14px] shrink-0 mt-1 opacity-40 group-hover:opacity-100 transition-opacity" style={{ color: '#6C6C88' }}>→</span>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Contact CTA */}
            <div className="mt-5 pt-4 text-center" style={{ borderTop: '1px solid #2A2A44' }}>
              <p className="text-[12px] mb-2" style={{ color: '#6C6C88' }}>
                Есть вопросы или нужна помощь?
              </p>
              <a href="tel:88005555335" className="block text-[16px] font-bold no-underline mb-1.5" style={{ color: '#E8491D' }}>
                8 800 555-53-35
              </a>
              <p className="text-[11px] font-semibold italic" style={{ color: '#06b6d4', lineHeight: 1.4 }}>
                Лучше позвонить, чем гадать —<br />мы поможем всё настроить в раз!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
