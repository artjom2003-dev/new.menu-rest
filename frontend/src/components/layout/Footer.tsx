'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

export function Footer() {
  const t = useTranslations('footer');

  const NAV = [
    {
      title: t('service'),
      links: [
        { href: '/restaurants', label: t('restaurants') },
        { href: '/blog', label: t('blog') },
        { href: '/loyalty', label: t('loyaltyProgram') },
        { href: '/about', label: t('about') },
      ],
    },
    {
      title: t('forRestaurants'),
      links: [
        { href: '/for-business', label: 'Для бизнеса' },
        { href: '/for-business', label: t('addRestaurant') },
        { href: '/for-business#pricing', label: t('pricing') },
        { href: '/listings', label: 'Вакансии и поставщики' },
      ],
    },
    {
      title: t('support'),
      links: [
        { href: '/help', label: t('help') },
        { href: '/contacts', label: t('contacts') },
        { href: '/privacy', label: t('privacy') },
        { href: '/terms', label: t('terms') },
      ],
    },
  ];

  return (
    <footer
      className="border-t mt-24"
      style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
      <div className="max-w-[1400px] mx-auto px-10 max-md:px-4 max-sm:px-3 py-14 max-sm:py-8">
        <div className="grid grid-cols-4 gap-10 max-md:grid-cols-2 max-sm:grid-cols-1 max-sm:gap-6">
          {/* Brand */}
          <div>
            <Link href="/" className="font-serif text-[22px] font-bold text-[var(--text)] no-underline tracking-[-0.03em] block mb-3">
              <span>Menu-<b style={{ color: 'var(--accent)', fontWeight: 900 }}>Rest</b></span>
            </Link>
            <p className="text-[12px] text-[var(--text3)] leading-[1.7] mb-5">
              {t('tagline')}
            </p>
            {/* Social links — uncomment when real URLs are available
            <div className="flex gap-2">
              {[
                { label: 'VK', href: 'https://vk.com/menurest' },
                { label: 'TG', href: 'https://t.me/menurest' },
              ].map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold border transition-all no-underline"
                  style={{ background: 'var(--card)', borderColor: 'var(--card-border)', color: 'var(--text3)' }}>
                  {s.label}
                </a>
              ))}
            </div>
            */}
          </div>

          {/* Nav columns */}
          {NAV.map((col) => (
            <div key={col.title}>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text3)] mb-4">
                {col.title}
              </h4>
              <ul className="flex flex-col gap-2.5 list-none p-0 m-0">
                {col.links.map((link, idx) => (
                  <li key={`${link.href}-${idx}`}>
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
          <span>© {new Date().getFullYear()} Menu-Rest. {t('rights')}</span>
          <span>{t('madeWith')}</span>
        </div>
      </div>
    </footer>
  );
}
