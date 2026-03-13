'use client';

import Link from 'next/link';

const NAV = [
  {
    title: 'Сервис',
    links: [
      { href: '/', label: 'Рестораны' },
      { href: '/blog', label: 'Журнал' },
      { href: '/loyalty', label: 'Программа лояльности' },
      { href: '/about', label: 'О нас' },
    ],
  },
  {
    title: 'Рестораторам',
    links: [
      { href: '/for-business', label: 'Разместить ресторан' },
      { href: '/for-business#pricing', label: 'Тарифы' },
      { href: '/for-business#analytics', label: 'Аналитика' },
    ],
  },
  {
    title: 'Поддержка',
    links: [
      { href: '/help', label: 'Помощь' },
      { href: '/contacts', label: 'Контакты' },
      { href: '/privacy', label: 'Политика конфиденциальности' },
      { href: '/terms', label: 'Условия использования' },
    ],
  },
];

export function Footer() {
  return (
    <footer
      className="border-t mt-24"
      style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
      <div className="max-w-[1400px] mx-auto px-10 py-14">
        <div className="grid grid-cols-4 gap-10 max-md:grid-cols-2 max-sm:grid-cols-1">
          {/* Brand */}
          <div>
            <Link href="/" className="font-serif text-[22px] font-bold text-[var(--text)] no-underline tracking-[-0.03em] block mb-3">
              menu<b style={{ color: 'var(--accent)', fontWeight: 900 }}>rest</b>
            </Link>
            <p className="text-[12px] text-[var(--text3)] leading-[1.7] mb-5">
              Умный поиск ресторанов по блюдам, аллергенам и бюджету. AI-поиск, КБЖУ, бронирование.
            </p>
            <div className="flex gap-2">
              {[
                { label: 'VK', href: '#' },
                { label: 'TG', href: '#' },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold border transition-all no-underline"
                  style={{ background: 'var(--card)', borderColor: 'var(--card-border)', color: 'var(--text3)' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--accent)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = '';
                    (e.currentTarget as HTMLElement).style.color = '';
                  }}>
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          {/* Nav columns */}
          {NAV.map((col) => (
            <div key={col.title}>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text3)] mb-4">
                {col.title}
              </h4>
              <ul className="flex flex-col gap-2.5 list-none p-0 m-0">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[13px] text-[var(--text3)] no-underline transition-colors duration-200 hover:text-[var(--text)]">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="flex items-center justify-between pt-8 mt-10 border-t text-[11px] text-[var(--text3)] max-sm:flex-col max-sm:gap-2 max-sm:text-center"
          style={{ borderColor: 'var(--card-border)' }}>
          <span>© {new Date().getFullYear()} Menu-Rest. Все права защищены.</span>
          <span>Сделано с ❤️ для гурманов России</span>
        </div>
      </div>
    </footer>
  );
}
