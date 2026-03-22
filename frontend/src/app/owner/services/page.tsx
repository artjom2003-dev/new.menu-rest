'use client';

import { useState } from 'react';
import { useOwner } from '@/components/owner/OwnerContext';

type Tab = 'free' | 'partner' | 'tech' | 'promo' | 'integrations' | 'consulting';

const TABS: { id: Tab; label: string }[] = [
  { id: 'free', label: '✅ Бесплатно' },
  { id: 'partner', label: '👑 Партнёр' },
  { id: 'tech', label: '⚡ Технологии' },
  { id: 'promo', label: '📣 Продвижение' },
  { id: 'integrations', label: '🔗 Интеграции' },
  { id: 'consulting', label: '🧠 Консалтинг' },
];

const CONTENT: Record<Tab, { head: string; sub: string; accent: string; items: { icon: string; name: string; desc: string; price?: string; tag?: string }[] }> = {
  free: {
    head: 'Уже работает — бесплатно',
    sub: 'Без подписки. Без комиссий. Без ограничений по времени.',
    accent: '#22c55e',
    items: [
      { icon: '🏪', name: 'Карточка в каталоге', desc: 'Фото, меню, часы работы, отзывы — из базы 123 000+ заведений' },
      { icon: '🤖', name: 'AI-поиск', desc: 'Нейросеть подбирает рестораны по описанию гостя' },
      { icon: '🌍', name: '8 языков', desc: 'Автоперевод для туристов, конверсия выше в 3–5 раз' },
      { icon: '🔍', name: 'Каталог и фильтры', desc: 'По кухне, цене, локации и особенностям' },
      { icon: '📝', name: '2 публикации/мес', desc: 'Акции и новинки в карточке и общей ленте' },
      { icon: '🎁', name: 'Программа лояльности', desc: 'Автоматические баллы за отзывы и бронирования' },
      { icon: '💬', name: 'Мессенджер', desc: 'Чат с гостями из «Хочу сходить»' },
    ],
  },
  partner: {
    head: 'Подписка «Партнёр» — 6 900 ₽/мес',
    sub: 'Первый месяц — 3 450 ₽. Всё бесплатное + инструменты роста.',
    accent: 'var(--accent)',
    items: [
      { icon: '📅', name: 'Онлайн-бронирование', desc: 'В 2 клика, без звонков. Управление в дашборде' },
      { icon: '📊', name: 'Аналитика', desc: 'Трафик, CTR, конверсия, тепловая карта, PDF-отчёты' },
      { icon: '🏅', name: 'Бейдж «Проверено»', desc: 'Приоритет в поиске и AI. +35% к CTR' },
      { icon: '📣', name: '15 публикаций/мес', desc: 'Лента, подборки, push-уведомления' },
      { icon: '🛒', name: 'Предзаказ блюд', desc: 'Гости выбирают заранее. Сбор 5%' },
      { icon: '🎯', name: 'Подборки', desc: 'AI-рекомендации и тематические коллекции' },
      { icon: '🎧', name: 'Персональный менеджер', desc: 'Ответ в течение 1 часа' },
    ],
  },
  tech: {
    head: 'Цифровые решения',
    sub: 'Автоматизация, которая впечатляет гостей и экономит время.',
    accent: 'var(--teal)',
    items: [
      { icon: '📱', name: 'Электронное меню', desc: 'QR → меню с фото, ценами, 8 языков', price: '1 500 ₽/мес' },
      { icon: '👨‍🍳', name: 'Приложение «Кухня»', desc: 'Заказы на экране повара в реальном времени', price: '2 900 ₽/мес' },
      { icon: '🖥️', name: 'Информационный терминал', desc: 'Сенсорный киоск: меню, аллергены, предзаказ', price: 'от 4 900 ₽/мес' },
      { icon: '📸', name: 'AI-фотосет меню', desc: 'Профессиональные фото блюд за 24 часа', price: '2 500 ₽' },
      { icon: '🎬', name: 'Промо-видео', desc: 'Видеоролик для соцсетей из ваших фото', price: 'от 4 900 ₽' },
    ],
  },
  promo: {
    head: 'Продвижение',
    sub: 'Охват, узнаваемость и новые гости.',
    accent: '#f59e0b',
    items: [
      { icon: '🔝', name: 'Спецразмещение', desc: 'Топ в поиске по городу и кухне', price: 'от 4 900 ₽', tag: '7 дн' },
      { icon: '🖼️', name: 'Баннер в каталоге', desc: 'Визуальный баннер, тысячи показов', price: 'от 19 900 ₽', tag: '14 дн' },
      { icon: '📣', name: 'Пост в TG / VK', desc: '50 000+ аудитория, 15 000 охват', price: '3 000 ₽' },
      { icon: '📆', name: 'Серия 4 постов', desc: 'Месячный пакет во всех каналах', price: '10 990 ₽' },
      { icon: '📰', name: 'Статья в блоге', desc: 'SEO-обзор — работает годами', price: '8 500 ₽' },
      { icon: '🗂️', name: 'Подборка', desc: '«Лучшие итальянские», «С террасой»', price: '7 000 ₽' },
    ],
  },
  integrations: {
    head: 'Интеграции и подключения',
    sub: 'Связываем MenuRest с вашими системами. Единая экосистема без ручной работы.',
    accent: '#3b82f6',
    items: [
      { icon: '💻', name: 'iiko', desc: 'Синхронизация меню, стоп-листа, заказов и аналитики. Двусторонний обмен данными в реальном времени', price: 'от 30 000 ₽' },
      { icon: '🖥️', name: 'R-Keeper', desc: 'Интеграция с POS-системой: меню, заказы, бронирования, чеки. Автоматическое обновление цен', price: 'от 30 000 ₽' },
      { icon: '📋', name: 'Poster', desc: 'Облачная касса → MenuRest: меню, остатки, статистика. Подключение за 2 дня', price: 'от 20 000 ₽' },
      { icon: '📊', name: 'CRM (Битрикс24, amoCRM)', desc: 'Бронирования и заявки автоматически попадают в вашу CRM. Воронка, напоминания, аналитика клиентов', price: 'от 25 000 ₽' },
      { icon: '📧', name: 'Email и SMS рассылки', desc: 'Подключаем Unisender, SendPulse или ваш сервис. Автоуведомления о бронях, акциях, отзывах', price: 'от 15 000 ₽' },
      { icon: '🗓️', name: '2ГИС / Яндекс.Карты', desc: 'Автосинхронизация информации: часы работы, фото, рейтинг. Единый источник данных', price: 'от 10 000 ₽' },
      { icon: '📱', name: 'Telegram-бот для ресторана', desc: 'Бронирование, просмотр меню, статус заказа — через бот для ваших гостей', price: 'от 35 000 ₽' },
      { icon: '🔗', name: 'Виджет бронирования', desc: 'JS-сниппет для вашего сайта. Гости бронируют через MenuRest прямо у вас', price: 'от 5 000 ₽' },
    ],
  },
  consulting: {
    head: 'Аналитика и консалтинг',
    sub: 'Стратегические решения на основе данных из 123 000 меню. Индивидуальный подход.',
    accent: '#8b5cf6',
    items: [
      { icon: '📊', name: 'Ресторанный индекс цен', desc: 'Ежемесячный отчёт: средний чек по 221 городу, динамика цен, топ блюд. Уникальные данные рынка', price: '14 900 ₽/мес', tag: 'Подписка' },
      { icon: '🔬', name: 'Конкурентный анализ', desc: 'Разбор 10+ конкурентов: цены, рейтинги, меню, слабые стороны. Рекомендации', price: '49 900 ₽', tag: 'Разово' },
      { icon: '💰', name: 'Аудит ценообразования', desc: 'Ваши цены vs рынок по каждой категории. Где теряете маржу, где — гостей', price: '39 900 ₽', tag: 'Разово' },
      { icon: '🗺️', name: 'Стратегия открытия', desc: 'Анализ локации: спрос, конкуренция, прогноз трафика. Для новых заведений', price: '89 900 ₽', tag: 'Проект' },
      { icon: '📈', name: 'Маркетинговая стратегия', desc: 'План продвижения на 6 мес: каналы, бюджет, KPI, ежемесячные созвоны', price: '149 900 ₽', tag: '6 мес' },
      { icon: '🎓', name: 'Менторство управляющего', desc: '8 сессий по 90 мин: операционка, маркетинг, финансы, команда', price: '199 900 ₽', tag: '2 мес' },
      { icon: '📰', name: 'PR и медиа-пакет', desc: 'Публикации в СМИ и Telegram-каналах. Бесплатный PR через аналитику', price: '79 900 ₽', tag: 'Квартал' },
    ],
  },
};

export default function OwnerServicesPage() {
  const { myRestaurant } = useOwner();
  const [tab, setTab] = useState<Tab>('free');
  const c = CONTENT[tab];

  return (
    <div>
      {/* Hero */}
      <div className="rounded-[20px] relative overflow-hidden mb-8"
        style={{ background: 'linear-gradient(135deg, rgba(255,92,40,0.07) 0%, rgba(139,92,246,0.05) 40%, rgba(57,255,209,0.04) 100%)', border: '1px solid var(--card-border)' }}>
        <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full opacity-10 blur-[80px]" style={{ background: 'var(--accent)' }} />
        <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full opacity-8 blur-[60px]" style={{ background: '#8b5cf6' }} />
        <div className="relative z-10 px-8 py-8 max-sm:px-5">
          <div className="flex items-start justify-between gap-6 max-md:flex-col">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold mb-4"
                style={{ background: 'rgba(255,92,40,0.1)', color: 'var(--accent)', border: '1px solid rgba(255,92,40,0.15)' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
                Платформа для ресторанного бизнеса
              </div>
              <h1 className="font-serif text-[28px] font-black text-[var(--text)] leading-tight mb-3 max-sm:text-[22px]">
                Помогаем расти<br />на каждом этапе
              </h1>
              <p className="text-[14px] text-[var(--text2)] leading-relaxed max-w-[460px] mb-5">
                От бесплатной карточки в каталоге до персональной стратегии развития и интеграции
                с вашими CRM, кассами и сервисами рассылок.
                {myRestaurant?.name && <span style={{ color: 'var(--accent)', fontWeight: 600 }}> Для «{myRestaurant.name}» — всё в одном месте.</span>}
              </p>
              <div className="flex gap-8 flex-wrap">
                {[
                  { v: '123 000+', l: 'ресторанов' },
                  { v: '221', l: 'город' },
                  { v: '8', l: 'языков' },
                  { v: '0 ₽', l: 'за старт' },
                ].map(s => (
                  <div key={s.l}>
                    <div className="text-[22px] font-black text-[var(--text)]">{s.v}</div>
                    <div className="text-[10px] text-[var(--text3)] uppercase tracking-wider">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Quick contact */}
            <div className="rounded-[14px] p-4 shrink-0 w-[220px] max-md:w-full"
              style={{ background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-[12px] font-bold text-[var(--text)] mb-1">Нужна помощь?</div>
              <p className="text-[10px] text-[var(--text3)] mb-3 leading-snug italic">Лучше позвонить, чем гадать —<br/>мы поможем всё настроить в раз!</p>
              <a href="tel:88005555335" className="block text-[15px] font-bold no-underline mb-1" style={{ color: 'var(--accent)' }}>8 800 555-53-35</a>
              <a href="mailto:business@menu-rest.ru" className="text-[11px] no-underline" style={{ color: 'var(--teal)' }}>business@menu-rest.ru</a>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-4 py-2 rounded-full text-[12px] font-semibold transition-all cursor-pointer border whitespace-nowrap"
            style={{
              background: tab === t.id ? `${CONTENT[t.id].accent}15` : 'var(--bg2)',
              color: tab === t.id ? CONTENT[t.id].accent : 'var(--text3)',
              borderColor: tab === t.id ? `${CONTENT[t.id].accent}30` : 'var(--card-border)',
              fontFamily: 'inherit',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[18px] font-bold text-[var(--text)] mb-0.5">{c.head}</h2>
          <p className="text-[12px] text-[var(--text3)]">{c.sub}</p>
        </div>
        {tab === 'partner' && (
          <a href="mailto:business@menu-rest.ru"
            className="px-5 py-2 rounded-full text-[12px] font-bold text-white no-underline shrink-0 transition-all"
            style={{ background: 'linear-gradient(135deg, var(--accent), #ff8c42)', boxShadow: '0 4px 16px var(--accent-glow)' }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'none')}>
            3 450 ₽ — первый месяц
          </a>
        )}
        {tab === 'consulting' && (
          <a href="tel:88005555335"
            className="px-5 py-2 rounded-full text-[12px] font-bold text-white no-underline shrink-0 transition-all"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'none')}>
            Обсудить проект
          </a>
        )}
      </div>

      {/* Cards */}
      <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {c.items.map(s => (
          <div key={s.name} className="rounded-[14px] p-4 transition-all duration-150 group"
            style={{ background: 'var(--bg2)', border: '1px solid var(--card-border)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = `${c.accent}40`; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${c.accent}10`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
            <div className="flex items-start gap-3">
              <span className="text-[22px] shrink-0 mt-0.5">{s.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[13px] font-bold text-[var(--text)]">{s.name}</span>
                  {s.tag && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${c.accent}15`, color: c.accent }}>{s.tag}</span>}
                </div>
                <p className="text-[11px] text-[var(--text3)] leading-[1.55] m-0 mb-1.5">{s.desc}</p>
                {s.price ? (
                  <span className="text-[11px] font-bold" style={{ color: c.accent }}>{s.price}</span>
                ) : tab === 'free' ? (
                  <span className="text-[11px] font-bold" style={{ color: '#22c55e' }}>Бесплатно</span>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
