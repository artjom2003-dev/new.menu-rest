import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Для бизнеса — MenuRest',
  description: 'Разместите ваш ресторан на MenuRest — бесплатный старт, подписка «Партнёр», продвижение, киоски и аналитика.',
};

export default function ForBusinessPage() {
  return (
    <main className="max-w-[960px] mx-auto px-5 py-16">
      {/* Hero */}
      <h1 className="font-serif text-[42px] font-black text-[var(--text)] mb-3">Для бизнеса</h1>
      <p className="text-[17px] text-[var(--text2)] mb-4 max-w-[640px]">
        Бесплатное базовое управление + подписка за дополнительные преимущества.
        Низкий барьер входа — рискуете только временем, а не бюджетом.
      </p>
      <p className="text-[14px] text-[var(--text3)] mb-14">
        Монетизация по модели «плати с результата»: нет онлайн-заказов — нет комиссии.
      </p>

      {/* ─── Бесплатное присутствие ─── */}
      <section className="mb-14">
        <h2 className="font-serif text-[28px] font-bold text-[var(--text)] mb-6">Бесплатное присутствие</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="border rounded-2xl p-6" style={{ borderColor: 'var(--card-border)', background: 'var(--card)' }}>
            <h3 className="text-[15px] font-bold text-[var(--text)] mb-3">Карточка заведения</h3>
            <ul className="space-y-2 text-[13px] text-[var(--text2)]">
              <li>Создаётся автоматически или вводится владельцем</li>
              <li>Название, адрес, телефон, сайт, часы работы, средний чек, описание</li>
              <li>Фото (до 10), меню (PDF), теги (тип, кухня, поводы, особенности)</li>
            </ul>
          </div>
          <div className="border rounded-2xl p-6" style={{ borderColor: 'var(--card-border)', background: 'var(--card)' }}>
            <h3 className="text-[15px] font-bold text-[var(--text)] mb-3">Видимость в каталоге</h3>
            <ul className="space-y-2 text-[13px] text-[var(--text2)]">
              <li>Отображение в каталоге и поиске по всем параметрам</li>
              <li>Нейтральное ранжирование (без приоритета, но без понижения)</li>
              <li>Доступен в MenuRest AI с полными данными карточки</li>
            </ul>
          </div>
        </div>
        <div className="border rounded-2xl p-5 mt-5" style={{ borderColor: 'var(--card-border)', background: 'var(--bg3)' }}>
          <h4 className="text-[13px] font-bold text-[var(--text3)] mb-2">Ограничения бесплатного аккаунта</h4>
          <ul className="space-y-1.5 text-[13px] text-[var(--text3)]">
            <li>Публикации (новости/акции/афиши) — не более 2 в месяц</li>
            <li>Онлайн-бронирование и предзаказ — недоступны (только «позвонить»)</li>
            <li>Подборки и премиум-оформление — недоступны</li>
          </ul>
        </div>
      </section>

      {/* ─── Тарифы ─── */}
      <section id="pricing" className="mb-14">
        <h2 className="font-serif text-[28px] font-bold text-[var(--text)] mb-6">Тарифы</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Бесплатный */}
          <div className="border rounded-2xl p-7" style={{ borderColor: 'var(--card-border)', background: 'var(--card)' }}>
            <h3 className="text-[18px] font-bold text-[var(--text)] mb-1">Бесплатный</h3>
            <p className="text-[28px] font-black text-[var(--text2)] mb-5">0 &#8381;/мес</p>
            <ul className="space-y-2.5 text-[13px] text-[var(--text2)]">
              <li>&#10003; Карточка заведения с фото (до 10)</li>
              <li>&#10003; Видимость в каталоге и AI-поиске</li>
              <li>&#10003; 2 публикации в месяц</li>
              <li>&#10003; Нейтральное ранжирование</li>
              <li className="text-[var(--text3)]">&#10007; Онлайн-бронирование</li>
              <li className="text-[var(--text3)]">&#10007; Аналитика</li>
              <li className="text-[var(--text3)]">&#10007; Подборки и продвижение</li>
            </ul>
          </div>

          {/* Партнёр */}
          <div className="border-2 rounded-2xl p-7 relative" style={{ borderColor: 'var(--accent)', background: 'var(--card)' }}>
            <span className="absolute -top-3 left-6 px-3 py-0.5 rounded-full text-[11px] font-bold text-white" style={{ background: 'var(--accent)' }}>
              Рекомендуем
            </span>
            <h3 className="text-[18px] font-bold text-[var(--text)] mb-1">Партнёр</h3>
            <p className="text-[28px] font-black text-[var(--accent)] mb-5">6 900 &#8381;/мес</p>
            <ul className="space-y-2.5 text-[13px] text-[var(--text2)]">
              <li>&#10003; До 15 публикаций в месяц</li>
              <li>&#10003; Повышенный приоритет в выдаче</li>
              <li>&#10003; Бейдж «Проверено»</li>
              <li>&#10003; Раздел «Рекомендуем попробовать»</li>
              <li>&#10003; Онлайн-бронирование столиков</li>
              <li>&#10003; Онлайн-предзаказ (сервисный сбор 5%)</li>
              <li>&#10003; Аналитика: источники трафика, тепловая карта, CTR</li>
              <li>&#10003; Экспорт отчётов</li>
            </ul>
          </div>
        </div>

        {/* Что происходит при отмене */}
        <div className="border rounded-2xl p-5 mt-5" style={{ borderColor: 'var(--card-border)', background: 'var(--bg3)' }}>
          <h4 className="text-[13px] font-bold text-[var(--text3)] mb-2">При отмене подписки</h4>
          <ul className="space-y-1.5 text-[13px] text-[var(--text3)]">
            <li>Автоматический переход на бесплатный аккаунт</li>
            <li>Онлайн-бронирование и предзаказы отключаются</li>
            <li>Аналитика не предоставляется, ранжирование — нейтральное</li>
            <li>Старые публикации остаются видны, лимит возвращается к 2/мес</li>
          </ul>
        </div>
      </section>

      {/* ─── Дополнительные платные возможности ─── */}
      <section className="mb-14">
        <h2 className="font-serif text-[28px] font-bold text-[var(--text)] mb-6">Дополнительные услуги</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          {/* Продвижение */}
          <div className="border rounded-2xl p-6" style={{ borderColor: 'var(--card-border)', background: 'var(--card)' }}>
            <h3 className="text-[15px] font-bold text-[var(--text)] mb-3">Продвижение</h3>
            <ul className="space-y-2 text-[13px] text-[var(--text2)]">
              <li>Спецразмещение 7 дней — от 4 900 &#8381;</li>
              <li>Баннер/плитка 14 дней — от 19 900 &#8381;</li>
              <li>Пост в TG/VK — 3 000 &#8381;</li>
              <li>Серия 4 постов — 10 990 &#8381;</li>
              <li>Статья о ресторане — 8 500 &#8381;</li>
              <li>Рассылка — 12 500 &#8381;</li>
            </ul>
          </div>

          {/* Подборки */}
          <div className="border rounded-2xl p-6" style={{ borderColor: 'var(--card-border)', background: 'var(--card)' }}>
            <h3 className="text-[15px] font-bold text-[var(--text)] mb-3">Сезонные подборки</h3>
            <ul className="space-y-2 text-[13px] text-[var(--text2)]">
              <li>Тематическая подборка — 7 000 &#8381;</li>
              <li>Подборка недели — 7 000 &#8381;</li>
              <li>Подборка месяца — 15 000 &#8381;</li>
              <li>Подборка года — 49 990 &#8381;</li>
            </ul>
          </div>

          {/* AI контент */}
          <div className="border rounded-2xl p-6" style={{ borderColor: 'var(--card-border)', background: 'var(--card)' }}>
            <h3 className="text-[15px] font-bold text-[var(--text)] mb-3">Контент-производство AI</h3>
            <ul className="space-y-2 text-[13px] text-[var(--text2)]">
              <li>Фотосет меню (10 блюд) — 2 500 &#8381;</li>
              <li>Генерация видео 30–60 сек — от 4 900 &#8381;</li>
              <li>Оформление меню — от 1 900 &#8381;</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ─── Технологические продукты ─── */}
      <section className="mb-14">
        <h2 className="font-serif text-[28px] font-bold text-[var(--text)] mb-6">Технологические продукты</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="border rounded-2xl p-6" style={{ borderColor: 'var(--card-border)', background: 'var(--card)' }}>
            <h3 className="text-[15px] font-bold text-[var(--text)] mb-3">Информационные киоски</h3>
            <ul className="space-y-2 text-[13px] text-[var(--text2)]">
              <li>Аренда — от 4 900 &#8381;/мес</li>
              <li>Покупка — 90 000 &#8381;</li>
              <li>Подключение/настройка — от 15 000 &#8381; разово</li>
              <li>Поддержка и обновления включены</li>
            </ul>
          </div>

          <div className="border rounded-2xl p-6" style={{ borderColor: 'var(--card-border)', background: 'var(--card)' }}>
            <h3 className="text-[15px] font-bold text-[var(--text)] mb-3">Приложение «Официант»</h3>
            <ul className="space-y-2 text-[13px] text-[var(--text2)]">
              <li>Лицензия на заведение — от 2 900 &#8381;/мес</li>
              <li>Доп. устройства — 490 &#8381;/мес за устройство</li>
            </ul>
          </div>

          <div className="border rounded-2xl p-6" style={{ borderColor: 'var(--card-border)', background: 'var(--card)' }}>
            <h3 className="text-[15px] font-bold text-[var(--text)] mb-3">Интеграции</h3>
            <ul className="space-y-2 text-[13px] text-[var(--text2)]">
              <li>Интеграция с кассой/учётом/CRM — от 30 000 &#8381; разово</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ─── Преимущества ─── */}
      <section id="analytics" className="mb-14">
        <h2 className="font-serif text-[28px] font-bold text-[var(--text)] mb-6">Почему Menu-Rest</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {[
            {
              title: 'Низкий барьер входа',
              desc: 'Бесплатный старт заполняет каталог контентом. Ресторан рискует только временем, а не бюджетом — это снимает возражение «дорого» на старте.',
            },
            {
              title: 'Гибкая монетизация',
              desc: 'Модель «плати с результата»: нет онлайн-заказов — нет комиссии. Безопасно для новых заведений с нестабильным потоком.',
            },
            {
              title: 'Масштабируемость',
              desc: 'Автоматический апсейл: когда комиссия на бесплатном тарифе превысит стоимость подписки, ресторан сам заинтересован перейти на «Партнёр».',
            },
            {
              title: 'AI-поиск нового поколения',
              desc: 'Гости находят ваш ресторан через естественный язык: «романтический ужин без глютена до 3000 на двоих» — и AI подбирает именно вас.',
            },
          ].map((item) => (
            <div key={item.title} className="border rounded-2xl p-6" style={{ borderColor: 'var(--card-border)', background: 'var(--card)' }}>
              <h3 className="text-[15px] font-bold text-[var(--text)] mb-2">{item.title}</h3>
              <p className="text-[13px] text-[var(--text2)] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="text-center border rounded-2xl p-10" style={{ borderColor: 'var(--card-border)', background: 'var(--bg3)' }}>
        <h3 className="font-serif text-[24px] font-bold text-[var(--text)] mb-2">Готовы начать?</h3>
        <p className="text-[14px] text-[var(--text3)] mb-6">Подключите ресторан бесплатно прямо сейчас</p>
        <a
          href="mailto:business@menu-rest.ru"
          className="inline-flex items-center justify-center px-8 py-4 rounded-full text-[15px] font-semibold text-white border-none cursor-pointer transition-all"
          style={{ background: 'var(--accent)', boxShadow: '0 0 20px var(--accent-glow)' }}>
          Подключить ресторан
        </a>
      </div>
    </main>
  );
}
