'use client';

import { useState } from 'react';
import Link from 'next/link';

const TABS = [
  { id: 'free', label: 'Бесплатное присутствие', color: 'var(--teal)', bg: 'rgba(57,255,209,0.08)', border: 'rgba(57,255,209,0.2)' },
  { id: 'partner', label: 'Подписка «Партнёр»', color: 'var(--accent)', bg: 'rgba(255,92,40,0.08)', border: 'rgba(255,92,40,0.2)' },
  { id: 'services', label: 'Технологии и сервисы', color: '#FFA83C', bg: 'rgba(255,168,60,0.08)', border: 'rgba(255,168,60,0.2)' },
  { id: 'integrations', label: 'Интеграции', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
  { id: 'consulting', label: 'Консалтинг', color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)' },
] as const;

type TabId = typeof TABS[number]['id'];

/* ── Reusable card with hover ── */
function Card({ children, color, className = '' }: { children: React.ReactNode; color?: string; className?: string }) {
  return (
    <div
      className={`rounded-[18px] max-sm:rounded-[14px] p-6 max-sm:p-4 border transition-all duration-300 ${className}`}
      style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        if (color) el.style.borderColor = color;
        el.style.boxShadow = `0 8px 30px ${color || 'rgba(255,92,40,0.08)'}25`;
        el.style.transform = 'translateY(-4px)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = 'var(--card-border)';
        el.style.boxShadow = 'none';
        el.style.transform = 'none';
      }}>
      {children}
    </div>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold"
      style={{ background: `color-mix(in srgb, ${color} 10%, transparent)`, color, border: `1px solid color-mix(in srgb, ${color} 15%, transparent)` }}>
      {label}
    </span>
  );
}

export default function ForBusinessPage() {
  const [tab, setTab] = useState<TabId>('free');

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        <div className="absolute rounded-full pointer-events-none"
          style={{ width: 700, height: 700, background: 'rgba(255,92,40,0.06)', filter: 'blur(120px)', top: -250, right: -150 }} />
        <div className="absolute rounded-full pointer-events-none"
          style={{ width: 500, height: 500, background: 'rgba(57,255,209,0.04)', filter: 'blur(100px)', bottom: -150, left: -100 }} />

        <div className="max-w-[1100px] mx-auto px-10 max-md:px-4 max-sm:px-3 pt-14 max-sm:pt-10 pb-10 max-sm:pb-6 relative z-10 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full text-[12px] font-semibold mb-7"
            style={{ background: 'rgba(255,92,40,0.1)', color: 'var(--accent)', border: '1px solid rgba(255,92,40,0.2)' }}>
            Платформа для ресторанов и кафе
          </span>

          <h1 className="font-serif font-black text-[var(--text)] leading-[1.05] mb-3 max-sm:text-[26px]"
            style={{ fontSize: 'clamp(30px, 5.5vw, 56px)' }}>
            Мы приводим гостей —{' '}
            <span style={{
              background: 'linear-gradient(135deg, var(--accent), #FFD700)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>вы создаёте вкус</span>
          </h1>

          <p className="font-serif text-[var(--text2)] leading-snug max-w-[640px] mx-auto mb-10 max-sm:text-[16px]"
            style={{ fontSize: 'clamp(17px, 2.2vw, 22px)' }}>
            Бронирования, продвижение, аналитика —{' '}
            <span style={{ color: 'var(--teal)', fontWeight: 600 }}>всё работает, пока вы готовите</span>
          </p>

          {/* Stats */}
          <div className="flex justify-center gap-10 mb-0 flex-wrap max-sm:gap-4">
            {[
              { value: '123 000+', label: 'ресторанов' },
              { value: '221', label: 'город' },
              { value: '8', label: 'языков' },
              { value: '0 ₽', label: 'за старт' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-[28px] font-black text-[var(--text)] max-sm:text-[18px]">{s.value}</div>
                <div className="text-[12px] max-sm:text-[10px] text-[var(--text3)] mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          ЦЕПОЧКА ЗАКАЗА — QR → Официант → Кухня
          ══════════════════════════════════════════════════════ */}
      <section className="max-w-[1100px] mx-auto px-10 max-md:px-4 max-sm:px-3 pb-14 max-sm:pb-8">
        <div className="text-center mb-10 max-sm:mb-6">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[12px] font-bold mb-5"
            style={{ background: 'rgba(186,255,57,0.08)', color: '#BAFF39', border: '1px solid rgba(186,255,57,0.15)' }}>
            <span className="w-2 h-2 rounded-full" style={{ background: '#BAFF39' }} />
            Полная автоматизация зала
          </span>
          <h2 className="font-serif font-black text-[var(--text)] mb-3 max-sm:text-[24px]"
            style={{ fontSize: 'clamp(26px, 3.5vw, 40px)' }}>
            От QR-кода до кухни —{' '}
            <span style={{
              background: 'linear-gradient(135deg, #BAFF39, var(--teal))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>без единого звонка</span>
          </h2>
          <p className="text-[15px] text-[var(--text3)] max-w-[560px] mx-auto leading-relaxed">
            Три приложения, которые работают как единая система.
            Гость заказывает — официант видит — повар готовит. Всё в реальном времени.
          </p>
        </div>

        {/* Pipeline: 3 cards with arrows */}
        <div className="grid grid-cols-3 gap-0 max-lg:grid-cols-1 max-lg:gap-4 mb-10 items-stretch">
          {/* Step 1: QR / Electronic menu */}
          <div className="relative">
            <Card color="#BAFF39" className="h-full">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black"
                  style={{ background: 'rgba(186,255,57,0.12)', color: '#BAFF39' }}>1</span>
                <h3 className="text-[16px] font-bold text-[var(--text)]">Электронное меню</h3>
              </div>
              <p className="text-[13px] text-[var(--text3)] leading-relaxed mb-4">
                QR-код на столе — гость сканирует телефоном и видит меню с фото, описанием и ценами.
                Выбирает блюда и оформляет заказ самостоятельно.
              </p>
              <div className="space-y-2">
                {['Без бумажных меню — экономия', 'Мгновенные обновления цен и стоп-листа', 'Работает на 8 языках для туристов', 'Фото и описание каждого блюда', 'Фильтрация по аллергенам'].map((b) => (
                  <div key={b} className="flex items-start gap-2 text-[12px]">
                    <span style={{ color: '#BAFF39' }} className="mt-0.5 flex-shrink-0">+</span>
                    <span className="text-[var(--text2)]">{b}</span>
                  </div>
                ))}
              </div>
            </Card>
            {/* Arrow */}
            <div className="absolute top-1/2 -right-5 w-10 h-10 flex items-center justify-center z-10 max-lg:hidden">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M14 7l5 5-5 5" stroke="#BAFF39" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="hidden max-lg:flex justify-center py-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M7 14l5 5 5-5" stroke="#BAFF39" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {/* Step 2: Waiter app */}
          <div className="relative">
            <Card color="var(--accent)" className="h-full">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black"
                  style={{ background: 'rgba(255,92,40,0.12)', color: 'var(--accent)' }}>2</span>
                <h3 className="text-[16px] font-bold text-[var(--text)]">Приложение официанта</h3>
              </div>
              <p className="text-[13px] text-[var(--text3)] leading-relaxed mb-4">
                Заказ мгновенно появляется на планшете или смартфоне официанта.
                Управление столами, статусами и чеками — всё в одном экране.
              </p>
              <div className="space-y-2">
                {['Карта зала с реальными статусами столов', 'Push-уведомления о новых заказах', 'Добавление позиций на ходу', 'Предчек и закрытие заказа в 1 тап', 'PIN-авторизация за 2 секунды'].map((b) => (
                  <div key={b} className="flex items-start gap-2 text-[12px]">
                    <span style={{ color: 'var(--accent)' }} className="mt-0.5 flex-shrink-0">+</span>
                    <span className="text-[var(--text2)]">{b}</span>
                  </div>
                ))}
              </div>
            </Card>
            {/* Arrow */}
            <div className="absolute top-1/2 -right-5 w-10 h-10 flex items-center justify-center z-10 max-lg:hidden">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M14 7l5 5-5 5" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="hidden max-lg:flex justify-center py-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M7 14l5 5 5-5" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {/* Step 3: Kitchen display */}
          <div>
            <Card color="var(--teal)" className="h-full">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black"
                  style={{ background: 'rgba(57,255,209,0.12)', color: 'var(--teal)' }}>3</span>
                <h3 className="text-[16px] font-bold text-[var(--text)]">Экран кухни (KDS)</h3>
              </div>
              <p className="text-[13px] text-[var(--text3)] leading-relaxed mb-4">
                Заказ появляется на экране повара в ту же секунду. Таймер, статус готовности,
                звуковое оповещение — ничего не потеряется.
              </p>
              <div className="space-y-2">
                {['Мгновенное отображение без задержек', 'Цветовые таймеры: серый → жёлтый → красный', 'Звуковой сигнал при новом заказе', 'Кнопка «Готово» — официант сразу видит', 'Работает на планшете, мониторе или ТВ'].map((b) => (
                  <div key={b} className="flex items-start gap-2 text-[12px]">
                    <span style={{ color: 'var(--teal)' }} className="mt-0.5 flex-shrink-0">+</span>
                    <span className="text-[var(--text2)]">{b}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Pipeline summary bar */}
        <div className="rounded-[20px] p-6 max-sm:p-4 text-center"
          style={{ background: 'linear-gradient(135deg, rgba(186,255,57,0.04), rgba(57,255,209,0.04))', border: '1px solid rgba(186,255,57,0.1)' }}>
          <div className="flex items-center justify-center gap-8 flex-wrap max-sm:gap-4">
            {[
              { value: '0 сек', label: 'от заказа до кухни', color: '#BAFF39' },
              { value: '−40%', label: 'ошибок в заказах', color: 'var(--accent)' },
              { value: '−25%', label: 'среднее время подачи', color: 'var(--teal)' },
              { value: '×2', label: 'оборачиваемость столов', color: '#FFD700' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-[24px] max-sm:text-[18px] font-black" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[11px] text-[var(--text3)] mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TABS ── */}
      <section className="max-w-[1100px] mx-auto px-10 max-md:px-4 max-sm:px-3 pb-14 max-sm:pb-10">
        {/* Tab bar */}
        <div className="flex justify-center mb-8 max-sm:mb-6">
          <div className="inline-flex gap-1.5 p-1.5 rounded-full max-sm:flex-col max-sm:w-full flex-wrap justify-center"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="px-5 py-2.5 rounded-full text-[12px] font-semibold transition-all duration-300 border-none cursor-pointer max-sm:w-full"
                style={{
                  fontFamily: 'inherit',
                  background: tab === t.id ? t.bg : 'transparent',
                  color: tab === t.id ? t.color : 'var(--text3)',
                  boxShadow: tab === t.id ? `0 2px 12px ${t.border}` : 'none',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ═══ TAB 1: Бесплатное присутствие ═══ */}
        {tab === 'free' && (
          <div>
            <div className="text-center mb-10">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[12px] font-bold mb-5"
                style={{ background: 'rgba(57,255,209,0.08)', color: 'var(--teal)', border: '1px solid rgba(57,255,209,0.15)' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: 'var(--teal)' }} />
                Уже работает
              </span>
              <h2 className="font-serif font-black text-[var(--text)] mb-3 max-sm:text-[26px]"
                style={{ fontSize: 'clamp(26px, 3.5vw, 38px)' }}>
                Новый канал привлечения гостей.{' '}
                <span style={{ color: 'var(--teal)' }}>Бесплатно.</span>
              </h2>
              <p className="text-[15px] text-[var(--text3)] max-w-[520px] mx-auto leading-relaxed">
                Ваш ресторан уже может быть в каталоге — среди 123 000 заведений,
                с AI-поиском и аудиторией на 8 языках. Без вложений и комиссий.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-5 max-lg:grid-cols-2 max-sm:grid-cols-2 max-sm:gap-2.5 mb-8">
              {[
                { icon: '📋', title: 'Полноценная карточка', desc: 'Фото, меню, часы работы, средний чек, кухня — всё в одном месте.', color: '#FF5C28' },
                { icon: '🤖', title: 'AI-поиск', desc: 'Гости описывают словами — AI находит именно вас.', color: '#39FFD1' },
                { icon: '🌍', title: '8 языков, 221 город', desc: 'Туристы находят ресторан на своём языке.', color: '#C4A1FF' },
                { icon: '🔍', title: 'Видимость в каталоге', desc: 'Фильтры по кухне, цене, расположению.', color: '#FFD700' },
                { icon: '📣', title: '2 публикации/мес', desc: 'Акции, новое меню — в ленту и рекомендации.', color: '#FF6B9D' },
                { icon: '📈', title: 'Рост без рисков', desc: 'Нет заказов — нет комиссии.', color: '#BAFF39' },
              ].map((f) => (
                <Card key={f.title} color={f.color}>
                  <span className="text-[28px] max-sm:text-[20px] mb-3 max-sm:mb-2 block">{f.icon}</span>
                  <h3 className="text-[15px] max-sm:text-[13px] font-bold text-[var(--text)] mb-1.5 max-sm:mb-1">{f.title}</h3>
                  <p className="text-[13px] max-sm:text-[11px] text-[var(--text3)] leading-relaxed">{f.desc}</p>
                </Card>
              ))}
            </div>

            <div className="rounded-[16px] p-5 mb-10 flex items-start gap-3 max-w-[620px] mx-auto"
              style={{ background: 'rgba(255,92,40,0.05)', border: '1px solid rgba(255,92,40,0.12)' }}>
              <span className="text-[20px] flex-shrink-0 mt-0.5">🛒</span>
              <p className="text-[13px] text-[var(--text2)] leading-relaxed">
                <span className="font-bold text-[var(--text)]">Онлайн-предзаказы</span> можно подключить отдельно, без подписки — с сервисным сбором 10% от заказа.
                В тарифе «Партнёр» сбор составляет всего 5%.
              </p>
            </div>

            <div className="text-center">
              <Link href="/restaurants"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-[15px] font-bold no-underline transition-all duration-300"
                style={{ color: 'var(--bg)', background: 'var(--teal)', boxShadow: '0 6px 30px var(--teal-glow)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'none'; }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
                Добавить ресторан бесплатно
              </Link>
              <p className="text-[12px] text-[var(--text3)] mt-3 opacity-60">Без скрытых платежей. Работает прямо сейчас.</p>
            </div>
          </div>
        )}

        {/* ═══ TAB 2: Подписка «Партнёр» ═══ */}
        {tab === 'partner' && (
          <div>
            <div className="text-center mb-10">
              <h2 className="font-serif font-black text-[var(--text)] mb-3 max-sm:text-[26px]"
                style={{ fontSize: 'clamp(26px, 3.5vw, 38px)' }}>
                Всё для роста —{' '}
                <span style={{
                  background: 'linear-gradient(135deg, var(--accent), #FFD700)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>в одной подписке</span>
              </h2>
              <p className="text-[15px] text-[var(--text3)] max-w-[520px] mx-auto leading-relaxed">
                Всё из бесплатного + бронирования, аналитика, приоритет в выдаче и продвижение.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1 max-sm:gap-2.5 mb-10">
              {[
                { icon: '📅', title: 'Онлайн-бронирование', desc: 'Гости бронируют в 2 клика — без звонков. Вы управляете заявками в личном кабинете.' },
                { icon: '📊', title: 'Аналитика и отчёты', desc: 'Источники трафика, тепловая карта, CTR карточки, конверсия в бронь. Экспорт в PDF.' },
                { icon: '🏅', title: 'Бейдж «Проверено» и приоритет', desc: 'Повышенное ранжирование в каталоге и AI-поиске. Бейдж увеличивает CTR на 35%.' },
                { icon: '📣', title: 'До 15 публикаций в месяц', desc: 'Акции, новое меню, события — попадайте в ленту и push-уведомления гостей.' },
                { icon: '🛒', title: 'Предзаказ блюд', desc: 'Гости выбирают блюда заранее — вы знаете загрузку кухни. Сервисный сбор всего 5%.' },
                { icon: '🎯', title: 'Попадание в подборки', desc: 'AI-рекомендации, тематические и сезонные подборки — доп. точки контакта с аудиторией.' },
              ].map((f) => (
                <Card key={f.title} color="rgba(255,92,40,0.5)" className="flex gap-4 max-sm:gap-3">
                  <span className="text-[28px] max-sm:text-[22px] flex-shrink-0">{f.icon}</span>
                  <div>
                    <h3 className="text-[15px] font-bold text-[var(--text)] mb-1.5">{f.title}</h3>
                    <p className="text-[13px] text-[var(--text3)] leading-relaxed">{f.desc}</p>
                  </div>
                </Card>
              ))}
            </div>

            {/* ── Pipeline: QR → Waiter → Kitchen ── */}
            <div className="rounded-[24px] p-8 max-sm:p-5 mb-10 relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(186,255,57,0.03), rgba(57,255,209,0.03))', border: '1px solid rgba(186,255,57,0.1)' }}>
              <div className="absolute rounded-full pointer-events-none" style={{ width: 300, height: 300, top: -100, right: -80, background: 'rgba(186,255,57,0.04)', filter: 'blur(60px)' }} />
              <div className="text-center mb-6 relative z-10">
                <h3 className="font-serif font-black text-[var(--text)] mb-2 max-sm:text-[20px]"
                  style={{ fontSize: 'clamp(20px, 3vw, 28px)' }}>
                  От QR-кода до кухни —{' '}
                  <span style={{ background: 'linear-gradient(135deg, #BAFF39, var(--teal))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    без единого звонка
                  </span>
                </h3>
                <p className="text-[13px] text-[var(--text3)] max-w-[480px] mx-auto">
                  Три приложения работают как единая система. Заказ проходит весь путь за секунды.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-1 max-lg:gap-3 relative z-10">
                {[
                  {
                    step: '1', color: '#BAFF39', title: 'Электронное меню',
                    desc: 'Гость сканирует QR-код и заказывает с телефона — без ожидания официанта.',
                    tags: ['QR-код', '8 языков', 'Без бумаги'],
                  },
                  {
                    step: '2', color: 'var(--accent)', title: 'Приложение официанта',
                    desc: 'Заказ мгновенно на экране. Карта зала, статусы столов, предчек — в одном приложении.',
                    tags: ['Push', 'Карта зала', 'PIN-вход'],
                  },
                  {
                    step: '3', color: 'var(--teal)', title: 'Экран кухни (KDS)',
                    desc: 'Повар видит заказ в ту же секунду. Таймеры, звук, кнопка «Готово» — ничего не теряется.',
                    tags: ['Реальное время', 'Таймеры', 'Планшет/ТВ'],
                  },
                ].map((s, i) => (
                  <div key={s.step} className="relative">
                    <div className="rounded-[16px] p-5 max-sm:p-4 border h-full transition-all duration-300"
                      style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = s.color; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--card-border)'; }}>
                      <div className="flex items-center gap-2.5 mb-3">
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black"
                          style={{ background: `color-mix(in srgb, ${s.color} 12%, transparent)`, color: s.color }}>{s.step}</span>
                        <h4 className="text-[14px] font-bold text-[var(--text)]">{s.title}</h4>
                      </div>
                      <p className="text-[12px] text-[var(--text3)] leading-relaxed mb-3">{s.desc}</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {s.tags.map((t) => <Tag key={t} label={t} color={s.color} />)}
                      </div>
                    </div>
                    {i < 2 && (
                      <div className="absolute top-1/2 -right-3 w-6 h-6 flex items-center justify-center z-10 max-lg:hidden">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke={s.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-center gap-8 mt-6 flex-wrap max-sm:gap-4 relative z-10">
                {[
                  { value: '0 сек', label: 'от заказа до кухни', color: '#BAFF39' },
                  { value: '−40%', label: 'ошибок', color: 'var(--accent)' },
                  { value: '−25%', label: 'время подачи', color: 'var(--teal)' },
                  { value: '×2', label: 'оборот столов', color: '#FFD700' },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <div className="text-[20px] max-sm:text-[16px] font-black" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-[10px] text-[var(--text3)]">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Price + 50% promo */}
            <div className="relative overflow-hidden rounded-[28px] p-[2px]"
              style={{
                background: 'linear-gradient(135deg, var(--accent), #FFD700, var(--teal), var(--accent))',
                backgroundSize: '300% 300%',
                animation: 'promo-shimmer 4s ease infinite',
              }}>
              <div className="relative overflow-hidden rounded-[26px] px-10 py-12 max-sm:px-6 max-sm:py-8"
                style={{ background: 'var(--bg)' }}>
                <div className="relative z-10">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[12px] font-bold mb-5"
                      style={{ background: 'rgba(255,92,40,0.1)', color: 'var(--accent)', border: '1px solid rgba(255,92,40,0.2)' }}>
                      <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
                      Только для новых партнёров
                    </div>
                    <h3 className="font-serif font-black text-[var(--text)] leading-[1] mb-2"
                      style={{ fontSize: 'clamp(32px, 5vw, 52px)' }}>
                      Первый месяц —{' '}
                      <span style={{
                        background: 'linear-gradient(135deg, var(--accent), #FFD700)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                      }}>−50%</span>
                    </h3>
                  </div>

                  <div className="flex items-center gap-10 max-md:flex-col max-md:text-center">
                    <div className="flex-1">
                      <div className="flex items-baseline gap-3 mb-1 max-md:justify-center flex-wrap">
                        <span className="text-[28px] font-bold line-through text-[var(--text3)] opacity-40">6 900 &#8381;</span>
                        <span className="text-[52px] font-black max-sm:text-[38px]"
                          style={{
                            background: 'linear-gradient(135deg, var(--accent), #FFD700)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                          }}>
                          3 450 &#8381;
                        </span>
                        <span className="text-[14px] text-[var(--text3)]">/первый мес</span>
                      </div>
                      <p className="text-[14px] text-[var(--text3)]">Далее 6 900 ₽/мес. Отмена в любой момент.</p>
                    </div>

                    <div className="flex flex-col items-center gap-3">
                      <a href="mailto:business@menu-rest.ru"
                        className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-[15px] font-bold text-white no-underline transition-all duration-300 whitespace-nowrap"
                        style={{
                          background: 'linear-gradient(135deg, var(--accent), #D44A20)',
                          boxShadow: '0 6px 30px rgba(255,92,40,0.35)',
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px) scale(1.03)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'none'; }}>
                        Забрать скидку 50%
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </a>
                      <span className="text-[11px] text-[var(--text3)] opacity-50">Для новых подключений</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ TAB 3: Технологии и сервисы ═══ */}
        {tab === 'services' && (
          <div>
            <div className="text-center mb-10">
              <h2 className="font-serif font-black text-[var(--text)] mb-3 max-sm:text-[26px]"
                style={{ fontSize: 'clamp(26px, 3.5vw, 38px)' }}>
                Цифровой сервис —{' '}
                <span style={{
                  background: 'linear-gradient(135deg, #FFA83C, var(--accent))',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>вместо бумаги и очередей</span>
              </h2>
            </div>

            {/* Technologies price list */}
            <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1 max-sm:gap-3 mb-12">
              {[
                { icon: '📱', title: 'Электронное меню', desc: 'QR-код → меню с фото на телефоне гостя. 8 языков, мгновенные обновления.', price: '1 500 ₽/мес', color: '#FFA83C', tags: ['QR-код', '8 языков', 'Стоп-лист'] },
                { icon: '👨‍🍳', title: 'Приложение «Кухня»', desc: 'Заказы на экране повара в реальном времени. Таймеры, статусы, звуковые оповещения.', price: '2 900 ₽/мес', color: 'var(--accent)', tags: ['Реальное время', 'Таймеры', 'Планшет/ТВ'] },
                { icon: '🖥', title: 'Информационный терминал', desc: 'Сенсорный киоск в зале. Гости листают меню, фильтруют по аллергенам, оформляют заказ.', price: 'от 4 900 ₽/мес', color: 'var(--teal)', tags: ['Сенсорный', 'Предзаказ', 'Аренда'] },
                { icon: '👔', title: 'Приложение официанта', desc: 'Карта зала, управление столами, приём заказов, предчек — всё в смартфоне.', price: '1 900 ₽/мес', color: '#C4A1FF', tags: ['Карта зала', 'Push', 'PIN-вход'] },
                { icon: '📸', title: 'AI-фотосет меню', desc: 'Профессиональные фото блюд, сгенерированные нейросетью по описанию.', price: '2 500 ₽', color: '#FF6B9D', tags: ['Разово', 'AI', 'Для меню'] },
                { icon: '🎬', title: 'Генерация промо-видео', desc: 'Короткие видео для соцсетей, сторис и рекламы — по вашим фото и концепции.', price: 'от 4 900 ₽', color: '#BAFF39', tags: ['Разово', 'Для рекламы'] },
              ].map((t) => (
                <Card key={t.title} color={t.color}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-[24px]">{t.icon}</span>
                      <h3 className="text-[15px] font-bold text-[var(--text)]">{t.title}</h3>
                    </div>
                    <span className="text-[13px] font-bold whitespace-nowrap" style={{ color: t.color }}>{t.price}</span>
                  </div>
                  <p className="text-[13px] text-[var(--text3)] leading-relaxed mb-3">{t.desc}</p>
                  <div className="flex gap-2 flex-wrap">
                    {t.tags.map((tag) => <Tag key={tag} label={tag} color={t.color} />)}
                  </div>
                </Card>
              ))}
            </div>

            {/* Promotion & collections */}
            <h3 className="font-serif text-[24px] font-bold text-[var(--text)] text-center mb-8">Продвижение и подборки</h3>

            <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1 max-sm:gap-3 mb-10">
              <div className="rounded-[20px] border overflow-hidden"
                style={{ borderColor: 'var(--card-border)', background: 'var(--card)' }}>
                <div className="px-6 py-3.5 border-b flex items-center gap-2.5"
                  style={{ borderColor: 'var(--card-border)', background: 'rgba(255,92,40,0.04)' }}>
                  <span className="text-[18px]">📣</span>
                  <h4 className="text-[15px] font-bold text-[var(--text)]">Продвижение</h4>
                </div>
                <div className="p-5 space-y-3.5">
                  {[
                    { name: 'Спецразмещение', note: '7 дней', price: 'от 4 900 ₽' },
                    { name: 'Баннер в каталоге', note: '14 дней', price: 'от 19 900 ₽' },
                    { name: 'Пост в TG / VK', note: '1 пост', price: '3 000 ₽' },
                    { name: 'Серия 4 постов', note: '1 мес', price: '10 990 ₽' },
                    { name: 'Статья о ресторане', note: 'блог', price: '8 500 ₽' },
                  ].map((i) => (
                    <div key={i.name} className="flex items-center justify-between text-[13px]">
                      <div>
                        <span className="text-[var(--text2)] font-medium">{i.name}</span>
                        <span className="text-[var(--text4)] ml-2 text-[11px]">{i.note}</span>
                      </div>
                      <span className="font-bold text-[var(--text)] whitespace-nowrap">{i.price}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[20px] border overflow-hidden"
                style={{ borderColor: 'var(--card-border)', background: 'var(--card)' }}>
                <div className="px-6 py-3.5 border-b flex items-center gap-2.5"
                  style={{ borderColor: 'var(--card-border)', background: 'rgba(196,161,255,0.04)' }}>
                  <span className="text-[18px]">🏆</span>
                  <h4 className="text-[15px] font-bold text-[var(--text)]">Подборки</h4>
                </div>
                <div className="p-5 space-y-3.5">
                  {[
                    { name: 'Тематическая подборка', price: '7 000 ₽' },
                    { name: 'Подборка недели', price: '7 000 ₽' },
                    { name: 'Подборка месяца', price: '15 000 ₽' },
                    { name: 'Подборка года', price: '49 990 ₽' },
                  ].map((i) => (
                    <div key={i.name} className="flex items-center justify-between text-[13px]">
                      <span className="text-[var(--text2)] font-medium">{i.name}</span>
                      <span className="font-bold text-[var(--text)] whitespace-nowrap">{i.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-center">
              <a href="mailto:business@menu-rest.ru"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-[13px] font-bold no-underline transition-all duration-300"
                style={{ color: '#FFA83C', background: 'rgba(255,168,60,0.08)', border: '1px solid rgba(255,168,60,0.2)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,168,60,0.15)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,168,60,0.08)'; }}>
                Обсудить внедрение
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
          </div>
        )}

        {/* ═══ TAB 4: Интеграции ═══ */}
        {tab === 'integrations' && (
          <div>
            <div className="text-center mb-10">
              <h2 className="font-serif font-black text-[var(--text)] mb-3 max-sm:text-[26px]"
                style={{ fontSize: 'clamp(26px, 3.5vw, 38px)' }}>
                Подключаем к вашей{' '}
                <span style={{ color: '#3b82f6' }}>инфраструктуре</span>
              </h2>
              <p className="text-[15px] text-[var(--text3)] max-w-[520px] mx-auto leading-relaxed">
                Интеграции с кассами, CRM, картами и мессенджерами — без потери данных и двойного ввода.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1 max-sm:gap-3 mb-10">
              {[
                { icon: '🖥', title: 'iiko', desc: 'Синхронизация меню, заказов и остатков с POS-системой iiko.', price: 'от 30 000 ₽', color: '#3b82f6' },
                { icon: '💻', title: 'R-Keeper', desc: 'Интеграция с R-Keeper: меню, стоп-лист, выгрузка заказов.', price: 'от 30 000 ₽', color: '#3b82f6' },
                { icon: '📊', title: 'Poster', desc: 'Подключение к Poster POS. Автоматическая синхронизация.', price: 'от 20 000 ₽', color: '#3b82f6' },
                { icon: '📇', title: 'CRM (Bitrix24, amoCRM)', desc: 'Бронирования и лиды прямиком в вашу CRM-систему.', price: 'от 25 000 ₽', color: '#3b82f6' },
                { icon: '📧', title: 'Email и SMS рассылки', desc: 'Автоматические напоминания, подтверждения, спецпредложения.', price: 'от 15 000 ₽', color: '#3b82f6' },
                { icon: '🗺', title: '2GIS / Яндекс Карты', desc: 'Синхронизация данных с картами: часы, фото, отзывы.', price: 'от 10 000 ₽', color: '#3b82f6' },
                { icon: '🤖', title: 'Telegram-бот', desc: 'Бот для бронирования, заказов и уведомлений прямо в Telegram.', price: 'от 35 000 ₽', color: '#3b82f6' },
                { icon: '📅', title: 'Виджет бронирования', desc: 'Встраиваемый виджет для вашего сайта. Бронирования без перехода.', price: 'от 5 000 ₽', color: '#3b82f6' },
              ].map((f) => (
                <Card key={f.title} color={f.color} className="flex gap-4 max-sm:gap-3">
                  <span className="text-[24px] flex-shrink-0">{f.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <h3 className="text-[15px] font-bold text-[var(--text)]">{f.title}</h3>
                      <span className="text-[12px] font-bold whitespace-nowrap" style={{ color: f.color }}>{f.price}</span>
                    </div>
                    <p className="text-[13px] text-[var(--text3)] leading-relaxed">{f.desc}</p>
                  </div>
                </Card>
              ))}
            </div>

            <div className="text-center">
              <a href="mailto:business@menu-rest.ru"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-[13px] font-bold no-underline transition-all duration-300"
                style={{ color: '#3b82f6', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.15)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(59,130,246,0.08)'; }}>
                Обсудить интеграцию
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
          </div>
        )}

        {/* ═══ TAB 5: Консалтинг ═══ */}
        {tab === 'consulting' && (
          <div>
            <div className="text-center mb-10">
              <h2 className="font-serif font-black text-[var(--text)] mb-3 max-sm:text-[26px]"
                style={{ fontSize: 'clamp(26px, 3.5vw, 38px)' }}>
                Экспертиза для{' '}
                <span style={{ color: '#8b5cf6' }}>вашего роста</span>
              </h2>
              <p className="text-[15px] text-[var(--text3)] max-w-[520px] mx-auto leading-relaxed">
                Аналитика рынка, аудит цен, маркетинговая стратегия — от специалистов ресторанной индустрии.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1 max-sm:gap-3 mb-10">
              {[
                { icon: '📊', title: 'Ресторанный ценовой индекс', desc: 'Ежемесячный отчёт: средние цены, тренды, позиционирование относительно конкурентов.', price: '14 900 ₽/мес', type: 'подписка' },
                { icon: '🔎', title: 'Анализ конкурентов', desc: 'Детальный разбор конкурентного окружения: цены, меню, отзывы, трафик.', price: '49 900 ₽', type: 'разово' },
                { icon: '💰', title: 'Аудит ценообразования', desc: 'Проверка ваших цен: фуд-кост, маржинальность, оптимальные точки.', price: '39 900 ₽', type: 'разово' },
                { icon: '🚀', title: 'Стратегия открытия', desc: 'Полное сопровождение запуска: локация, концепция, меню, ценообразование.', price: '89 900 ₽', type: 'проект' },
                { icon: '📈', title: 'Маркетинговая стратегия', desc: 'Полугодовой план продвижения: каналы, бюджеты, KPI, контент-план.', price: '149 900 ₽', type: '6 мес' },
                { icon: '👨‍🏫', title: 'Менторство управляющего', desc: 'Индивидуальная работа с управляющим: операционка, финансы, команда.', price: '199 900 ₽', type: '2 мес' },
                { icon: '📰', title: 'PR и медиа-пакет', desc: 'Публикации в СМИ, обзоры блогеров, организация мероприятий.', price: '79 900 ₽', type: 'квартал' },
              ].map((f) => (
                <Card key={f.title} color="#8b5cf6" className="flex gap-4 max-sm:gap-3">
                  <span className="text-[24px] flex-shrink-0">{f.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5 gap-2">
                      <h3 className="text-[15px] font-bold text-[var(--text)]">{f.title}</h3>
                      <div className="text-right flex-shrink-0">
                        <div className="text-[12px] font-bold" style={{ color: '#8b5cf6' }}>{f.price}</div>
                        <div className="text-[10px] text-[var(--text4)]">{f.type}</div>
                      </div>
                    </div>
                    <p className="text-[13px] text-[var(--text3)] leading-relaxed">{f.desc}</p>
                  </div>
                </Card>
              ))}
            </div>

            <div className="text-center">
              <a href="mailto:business@menu-rest.ru"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-[13px] font-bold no-underline transition-all duration-300"
                style={{ color: '#8b5cf6', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.15)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.08)'; }}>
                Заказать консультацию
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
          </div>
        )}
      </section>

      {/* ── КОНТАКТЫ ── */}
      <section className="max-w-[1100px] mx-auto px-10 max-md:px-4 max-sm:px-3 pb-8">
        <div className="rounded-[20px] p-8 max-sm:p-5 flex items-center justify-between gap-8 max-sm:flex-col max-sm:text-center"
          style={{ background: 'var(--card)', border: '1px solid var(--card-border)' }}>
          <div>
            <h3 className="text-[18px] font-bold text-[var(--text)] mb-1">Остались вопросы?</h3>
            <p className="text-[13px] text-[var(--text3)]">Свяжитесь с нами — поможем подобрать решение под ваш ресторан</p>
          </div>
          <div className="flex items-center gap-6 max-sm:flex-col max-sm:gap-3">
            <a href="tel:+78005555335" className="text-[15px] font-bold text-[var(--text)] no-underline hover:text-[var(--accent)] transition-colors">
              8 800 555-53-35
            </a>
            <a href="mailto:business@menu-rest.ru" className="text-[15px] font-bold no-underline transition-colors" style={{ color: 'var(--accent)' }}>
              business@menu-rest.ru
            </a>
          </div>
        </div>
      </section>

      {/* ── ФИНАЛЬНЫЙ CTA ── */}
      <section className="max-w-[800px] mx-auto px-10 max-md:px-4 max-sm:px-3 pb-14 max-sm:pb-10">
        <div className="rounded-[24px] max-sm:rounded-[18px] px-8 max-sm:px-5 py-12 max-sm:py-8 text-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, var(--accent), #D44A20)', boxShadow: '0 16px 60px rgba(255,92,40,0.2)' }}>
          <div className="absolute rounded-full" style={{ top: -60, right: -60, width: 260, height: 260, background: 'rgba(255,255,255,0.06)' }} />
          <div className="absolute rounded-full" style={{ bottom: -40, left: -40, width: 200, height: 200, background: 'rgba(255,255,255,0.04)' }} />
          <div className="relative z-10">
            <h2 className="font-serif font-black text-white mb-3 max-sm:text-[24px]"
              style={{ fontSize: 'clamp(24px, 3.5vw, 32px)' }}>
              Начните получать гостей сегодня
            </h2>
            <p className="text-[15px] text-white/70 mb-8 max-w-[420px] mx-auto">
              Добавьте ресторан бесплатно за 2 минуты — или подключите «Партнёр» со скидкой 50%
            </p>
            <div className="flex gap-3 justify-center max-sm:flex-col max-sm:items-center">
              <Link href="/restaurants"
                className="px-7 py-3.5 rounded-full text-[14px] font-bold no-underline transition-all duration-300"
                style={{ background: 'white', color: 'var(--accent)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'none'; }}>
                Добавить бесплатно
              </Link>
              <a href="mailto:business@menu-rest.ru"
                className="px-7 py-3.5 rounded-full text-[14px] font-bold no-underline transition-all duration-300"
                style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.25)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.15)'; }}>
                Связаться с нами
              </a>
            </div>
            <p className="text-[11px] text-white/35 mt-4">Без скрытых платежей и обязательств</p>
          </div>
        </div>
      </section>

      <style>{`
        @keyframes promo-shimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </>
  );
}
