'use client';

import { useState } from 'react';
import Link from 'next/link';

const TABS = [
  { id: 'free', label: 'Бесплатное присутствие', color: 'var(--teal)', bg: 'rgba(57,255,209,0.08)', border: 'rgba(57,255,209,0.2)' },
  { id: 'partner', label: 'Подписка «Партнёр»', color: 'var(--accent)', bg: 'rgba(255,92,40,0.08)', border: 'rgba(255,92,40,0.2)' },
  { id: 'services', label: 'Доп. услуги и сервисы', color: '#FFA83C', bg: 'rgba(255,168,60,0.08)', border: 'rgba(255,168,60,0.2)' },
] as const;

type TabId = typeof TABS[number]['id'];

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

        <div className="max-w-[1100px] mx-auto px-10 max-md:px-4 max-sm:px-3 pt-20 pb-14 relative z-10 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full text-[12px] font-semibold mb-7"
            style={{ background: 'rgba(255,92,40,0.1)', color: 'var(--accent)', border: '1px solid rgba(255,92,40,0.2)' }}>
            Платформа для ресторанов и кафе
          </span>

          <h1 className="font-serif font-black text-[var(--text)] leading-[1.05] mb-4 max-sm:text-[32px]"
            style={{ fontSize: 'clamp(36px, 5.5vw, 56px)' }}>
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
          <div className="flex justify-center gap-12 mb-0 flex-wrap max-sm:gap-6">
            {[
              { value: '123 000+', label: 'ресторанов' },
              { value: '221', label: 'город' },
              { value: '8', label: 'языков' },
              { value: '0 ₽', label: 'за старт' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-[28px] font-black text-[var(--text)] max-sm:text-[22px]">{s.value}</div>
                <div className="text-[12px] text-[var(--text3)] mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TABS ── */}
      <section className="max-w-[1100px] mx-auto px-10 max-md:px-4 max-sm:px-3 pb-20">
        {/* Tab bar */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex gap-2 p-1.5 rounded-full max-sm:flex-col max-sm:w-full"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="px-6 py-2.5 rounded-full text-[13px] font-semibold transition-all duration-300 border-none cursor-pointer max-sm:w-full"
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
            {/* Header */}
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

            {/* Features grid */}
            <div className="grid grid-cols-3 gap-5 max-lg:grid-cols-2 max-sm:grid-cols-1 mb-10">
              {[
                { icon: '📋', title: 'Полноценная карточка', desc: 'Фото, меню, часы работы, средний чек, кухня — всё в одном месте. Создаётся автоматически или вами.', color: '#FF5C28' },
                { icon: '🤖', title: 'AI-поиск нового поколения', desc: '«Романтический ужин без глютена до 3000 ₽» — гости описывают словами, AI находит именно вас.', color: '#39FFD1' },
                { icon: '🌍', title: '8 языков, 221 город', desc: 'Туристы находят ваш ресторан на своём языке. Карточка автоматически переводится.', color: '#C4A1FF' },
                { icon: '🔍', title: 'Видимость в каталоге', desc: 'Фильтры по кухне, цене, расположению, особенностям. Ваше заведение находят те, кому оно подходит.', color: '#FFD700' },
                { icon: '📣', title: '2 публикации в месяц', desc: 'Расскажите об акциях, новом меню или событии — и попадите в ленту и рекомендации.', color: '#FF6B9D' },
                { icon: '📈', title: 'Рост без рисков', desc: 'Нет заказов — нет комиссии. Бесплатный тариф без ограничений по времени.', color: '#BAFF39' },
              ].map((f) => (
                <div key={f.title}
                  className="rounded-[18px] p-6 border transition-all duration-300"
                  style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = f.color;
                    el.style.boxShadow = `0 8px 30px ${f.color}25`;
                    el.style.transform = 'translateY(-4px)';
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = 'var(--card-border)';
                    el.style.boxShadow = 'none';
                    el.style.transform = 'none';
                  }}>
                  <span className="text-[28px] mb-3 block">{f.icon}</span>
                  <h3 className="text-[15px] font-bold text-[var(--text)] mb-2">{f.title}</h3>
                  <p className="text-[13px] text-[var(--text3)] leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>

            {/* Preorder note */}
            <div className="rounded-[16px] p-5 mb-10 flex items-start gap-3 max-w-[620px] mx-auto"
              style={{ background: 'rgba(255,92,40,0.05)', border: '1px solid rgba(255,92,40,0.12)' }}>
              <span className="text-[20px] flex-shrink-0 mt-0.5">🛒</span>
              <p className="text-[13px] text-[var(--text2)] leading-relaxed">
                <span className="font-bold text-[var(--text)]">Онлайн-предзаказы</span> можно подключить отдельно, без подписки — с сервисным сбором 10% от заказа.
                В тарифе «Партнёр» сбор составляет всего 5%.
              </p>
            </div>

            {/* CTA */}
            <div className="text-center">
              <Link href="/restaurants"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-[15px] font-bold no-underline transition-all duration-300"
                style={{ color: 'var(--bg)', background: 'var(--teal)', boxShadow: '0 6px 30px var(--teal-glow)' }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.transform = 'translateY(-3px)';
                  el.style.boxShadow = '0 10px 40px rgba(57,255,209,0.25)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.transform = 'none';
                  el.style.boxShadow = '0 6px 30px var(--teal-glow)';
                }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
                Добавить ресторан бесплатно
              </Link>
              <p className="text-[12px] text-[var(--text3)] mt-3 opacity-60">
                Без скрытых платежей. Работает прямо сейчас.
              </p>
            </div>
          </div>
        )}

        {/* ═══ TAB 2: Подписка «Партнёр» ═══ */}
        {tab === 'partner' && (
          <div>
            {/* Header */}
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
                Превращайте просмотры в реальных гостей.
              </p>
            </div>

            {/* Features 2-col */}
            <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1 mb-12">
              {[
                { icon: '📅', title: 'Онлайн-бронирование', desc: 'Гости бронируют в 2 клика — без звонков. Вы управляете заявками в личном кабинете, снижаете no-show.' },
                { icon: '📊', title: 'Аналитика и отчёты', desc: 'Источники трафика, тепловая карта просмотров, CTR карточки, конверсия в бронь. Экспорт в PDF.' },
                { icon: '🏅', title: 'Бейдж «Проверено» и приоритет', desc: 'Повышенное ранжирование в каталоге и AI-поиске. Бейдж доверия увеличивает CTR на 35%.' },
                { icon: '📣', title: 'До 15 публикаций в месяц', desc: 'Акции, новое меню, события — попадайте в ленту, подборки и push-уведомления гостей.' },
                { icon: '🛒', title: 'Предзаказ блюд', desc: 'Гости выбирают блюда заранее — вы знаете загрузку кухни. Сервисный сбор всего 5%.' },
                { icon: '🎯', title: 'Попадание в подборки', desc: 'AI-рекомендации, тематические и сезонные подборки — дополнительные точки контакта с аудиторией.' },
              ].map((f) => (
                <div key={f.title}
                  className="rounded-[18px] p-6 border flex gap-4 transition-all duration-300"
                  style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = 'rgba(255,92,40,0.3)';
                    el.style.boxShadow = '0 8px 30px rgba(255,92,40,0.08)';
                    el.style.transform = 'translateY(-3px)';
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = 'var(--card-border)';
                    el.style.boxShadow = 'none';
                    el.style.transform = 'none';
                  }}>
                  <span className="text-[28px] flex-shrink-0">{f.icon}</span>
                  <div>
                    <h3 className="text-[15px] font-bold text-[var(--text)] mb-1.5">{f.title}</h3>
                    <p className="text-[13px] text-[var(--text3)] leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Price + 50% promo */}
            <div
              className="relative overflow-hidden rounded-[28px] p-[2px]"
              style={{
                background: 'linear-gradient(135deg, var(--accent), #FFD700, var(--teal), var(--accent))',
                backgroundSize: '300% 300%',
                animation: 'promo-shimmer 4s ease infinite',
              }}>
              <div
                className="relative overflow-hidden rounded-[26px] px-10 py-12 max-sm:px-6 max-sm:py-8"
                style={{ background: 'var(--bg)' }}>
                <div className="absolute pointer-events-none"
                  style={{ width: 400, height: 400, top: -150, left: -100, background: 'radial-gradient(circle, rgba(255,92,40,0.08) 0%, transparent 70%)' }} />
                <div className="absolute pointer-events-none"
                  style={{ width: 350, height: 350, bottom: -120, right: -80, background: 'radial-gradient(circle, rgba(255,215,0,0.06) 0%, transparent 70%)' }} />

                <div className="relative z-10">
                  {/* Big headline */}
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
                        filter: 'drop-shadow(0 0 20px rgba(255,92,40,0.3))',
                      }}>−50%</span>
                    </h3>
                  </div>

                  <div className="flex items-center gap-10 max-md:flex-col max-md:text-center">
                  {/* Left — price */}
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
                    <p className="text-[14px] text-[var(--text3)]">
                      Далее 6 900 ₽/мес. Отмена в любой момент.
                    </p>
                  </div>

                  {/* Right — CTA */}
                  <div className="flex flex-col items-center gap-3">
                    <a href="mailto:business@menu-rest.ru"
                      className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-[15px] font-bold text-white no-underline transition-all duration-300 whitespace-nowrap"
                      style={{
                        background: 'linear-gradient(135deg, var(--accent), #D44A20)',
                        boxShadow: '0 6px 30px rgba(255,92,40,0.35)',
                      }}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.transform = 'translateY(-3px) scale(1.03)';
                        el.style.boxShadow = '0 10px 40px rgba(255,92,40,0.45)';
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.transform = 'none';
                        el.style.boxShadow = '0 6px 30px rgba(255,92,40,0.35)';
                      }}>
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

        {/* ═══ TAB 3: Доп. услуги и сервисы ═══ */}
        {tab === 'services' && (
          <div>
            {/* ── Цифровые сервисы (акцент) ── */}
            <div className="text-center mb-10">
              <h2 className="font-serif font-black text-[var(--text)] mb-3 max-sm:text-[26px]"
                style={{ fontSize: 'clamp(26px, 3.5vw, 38px)' }}>
                Цифровой сервис —{' '}
                <span style={{
                  background: 'linear-gradient(135deg, #FFA83C, var(--accent))',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>вместо бумаги и очередей</span>
              </h2>
              <p className="text-[15px] text-[var(--text3)] max-w-[500px] mx-auto leading-relaxed">
                Электронное меню, приложение для кухни и информационный терминал
              </p>
            </div>

            {/* Kiosk showcase */}
            <div className="grid items-center gap-10 mb-16 max-lg:gap-8" style={{ gridTemplateColumns: '1fr 1fr' }}>
              {/* Photo */}
              <div className="relative flex justify-center max-lg:order-2">
                <div className="absolute pointer-events-none"
                  style={{
                    width: '80%', height: '80%', top: '10%', left: '10%',
                    background: 'radial-gradient(ellipse, rgba(255,168,60,0.12) 0%, transparent 70%)',
                    filter: 'blur(40px)',
                  }} />
                <div className="relative rounded-[28px] overflow-hidden"
                  style={{
                    boxShadow: '0 40px 100px rgba(0,0,0,0.5), 0 0 80px rgba(255,168,60,0.08)',
                    maxWidth: 440,
                  }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/info-kiosk.png"
                    alt="Информационный терминал Menu-Rest"
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                  />
                  <div className="absolute inset-x-0 bottom-0 h-[100px] pointer-events-none"
                    style={{ background: 'linear-gradient(to top, rgba(6,6,10,0.7), transparent)' }} />
                  <div className="absolute bottom-4 left-4">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold"
                      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', color: '#FFA83C', border: '1px solid rgba(255,168,60,0.25)' }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#FFA83C' }} />
                      Информационный терминал
                    </span>
                  </div>
                </div>
              </div>

              {/* 3 products */}
              <div className="flex flex-col gap-5 max-lg:order-1">
                {[
                  {
                    title: 'Электронное меню',
                    desc: 'QR-код на столе — гость сканирует и видит меню с фото и ценами. Обновляется мгновенно, работает на 8 языках.',
                    tags: ['Без бумаги', 'Мгновенные обновления', '8 языков'],
                    color: '#FFA83C',
                  },
                  {
                    title: 'Приложение «Кухня»',
                    desc: 'Заказы мгновенно на экране повара. Принял, готовит, отдал — гость видит статус в реальном времени.',
                    tags: ['Без задержек', 'Статус заказа', 'Планшет / ТВ'],
                    color: 'var(--accent)',
                  },
                  {
                    title: 'Информационный терминал',
                    desc: 'Сенсорный киоск в зале. Гости листают меню, фильтруют по аллергенам, делают предзаказ без ожидания.',
                    tags: ['Сенсорный экран', 'Предзаказ', 'от 4 900 ₽/мес'],
                    color: 'var(--teal)',
                  },
                ].map((p) => (
                  <div key={p.title}
                    className="rounded-[18px] p-6 border transition-all duration-300"
                    style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderColor = p.color;
                      el.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderColor = 'var(--card-border)';
                      el.style.transform = 'none';
                    }}>
                    <h3 className="text-[15px] font-bold text-[var(--text)] mb-1.5">{p.title}</h3>
                    <p className="text-[13px] text-[var(--text3)] leading-relaxed mb-3">{p.desc}</p>
                    <div className="flex gap-2 flex-wrap">
                      {p.tags.map((tag) => (
                        <span key={tag} className="px-2.5 py-1 rounded-full text-[10px] font-semibold"
                          style={{ background: `color-mix(in srgb, ${p.color} 10%, transparent)`, color: p.color, border: `1px solid color-mix(in srgb, ${p.color} 15%, transparent)` }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Продвижение и подборки ── */}
            <h3 className="font-serif text-[24px] font-bold text-[var(--text)] text-center mb-8">
              Продвижение и подборки
            </h3>

            <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1 mb-12">
              {/* Продвижение */}
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

              {/* Подборки */}
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

            {/* ── Технологии прайс ── */}
            <h3 className="font-serif text-[24px] font-bold text-[var(--text)] text-center mb-8">
              Технологии
            </h3>

            <div className="max-w-[600px] mx-auto rounded-[20px] border overflow-hidden mb-8"
              style={{ borderColor: 'var(--card-border)', background: 'var(--card)' }}>
              <div className="px-6 py-3.5 border-b flex items-center gap-2.5"
                style={{ borderColor: 'var(--card-border)', background: 'rgba(57,255,209,0.04)' }}>
                <span className="text-[18px]">⚡</span>
                <h4 className="text-[15px] font-bold text-[var(--text)]">Цифровые решения</h4>
              </div>
              <div className="p-5 space-y-3.5">
                {[
                  { name: 'Информационный терминал', note: 'аренда', price: 'от 4 900 ₽/мес' },
                  { name: 'Приложение «Кухня»', note: 'подписка', price: '2 900 ₽/мес' },
                  { name: 'Электронное меню', note: 'подписка', price: '1 500 ₽/мес' },
                  { name: 'AI-фотосет меню', note: 'разово', price: '2 500 ₽' },
                  { name: 'Генерация видео', note: 'разово', price: 'от 4 900 ₽' },
                  { name: 'Интеграция с кассой', note: 'разово', price: 'от 30 000 ₽' },
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

            <div className="text-center">
              <a href="mailto:business@menu-rest.ru"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-[13px] font-bold no-underline transition-all duration-300"
                style={{ color: '#FFA83C', background: 'rgba(255,168,60,0.08)', border: '1px solid rgba(255,168,60,0.2)' }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = 'rgba(255,168,60,0.15)';
                  el.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = 'rgba(255,168,60,0.08)';
                  el.style.transform = 'none';
                }}>
                Обсудить внедрение
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
          </div>
        )}
      </section>

      {/* ── ФИНАЛЬНЫЙ CTA ── */}
      <section className="max-w-[800px] mx-auto px-10 max-md:px-4 max-sm:px-3 pb-20">
        <div className="rounded-[24px] px-8 py-12 text-center relative overflow-hidden"
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
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.transform = 'translateY(-2px)';
                  el.style.boxShadow = '0 8px 30px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.transform = 'none';
                  el.style.boxShadow = 'none';
                }}>
                Добавить бесплатно
              </Link>
              <a href="mailto:business@menu-rest.ru"
                className="px-7 py-3.5 rounded-full text-[14px] font-bold no-underline transition-all duration-300"
                style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.25)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.15)';
                }}>
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
