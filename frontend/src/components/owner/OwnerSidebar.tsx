'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useOwner } from './OwnerContext';

const NAV = [
  { href: '/owner', icon: '📊', label: 'Дашборд' },
  { href: '/owner/edit', icon: '✏️', label: 'Карточка' },
  { href: '/owner/photos', icon: '📸', label: 'Фото' },
  { href: '/owner/posts', icon: '📝', label: 'Публикации' },
  { href: '/owner/analytics', icon: '📈', label: 'Аналитика' },
  { href: '/owner/bookings', icon: '📅', label: 'Бронирования' },
  { href: '/owner/reviews', icon: '⭐', label: 'Отзывы' },
  { href: '/owner/services', icon: '💼', label: 'Услуги' },
  { href: '/owner/listings', icon: '📋', label: 'Объявления' },
];

export function OwnerSidebar() {
  const pathname = usePathname();
  const { myRestaurant } = useOwner();

  const isActive = (href: string) =>
    href === '/owner' ? pathname === '/owner' : pathname.startsWith(href);

  return (
    <aside style={{ width: 220, minWidth: 220, flexShrink: 0 }}>
      {/* Restaurant identity */}
      <div className="rounded-[16px] border p-4 mb-4"
        style={{ background: 'linear-gradient(135deg, rgba(255,92,40,0.06), rgba(57,255,209,0.03))', borderColor: 'var(--card-border)' }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-[10px] flex items-center justify-center text-[20px]"
            style={{ background: 'linear-gradient(135deg, var(--accent), #ff8c42)', boxShadow: '0 4px 12px var(--accent-glow)' }}>
            🍽️
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-bold text-[var(--text)] truncate">{myRestaurant?.name || 'Мой ресторан'}</div>
            <div className="text-[11px] text-[var(--text3)] truncate">{myRestaurant?.address || ''}</div>
          </div>
        </div>
        {myRestaurant && (
          <Link href={`/restaurants/${myRestaurant.slug}`}
            className="text-[11px] text-[var(--accent)] font-semibold no-underline hover:underline">
            Открыть на сайте →
          </Link>
        )}
      </div>

      {/* Navigation */}
      <nav className="space-y-1">
        {NAV.map(item => {
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-4 py-2.5 rounded-[12px] no-underline transition-all"
              style={{
                background: active ? 'linear-gradient(135deg, rgba(255,92,40,0.1), rgba(255,92,40,0.04))' : 'transparent',
                color: active ? 'var(--text)' : 'var(--text3)',
                fontWeight: active ? 600 : 400,
                fontSize: 13,
                border: active ? '1px solid rgba(255,92,40,0.15)' : '1px solid transparent',
              }}>
              <span className="text-[16px]">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Back to profile */}
      <div className="mt-6 pt-4" style={{ borderTop: '1px solid var(--card-border)' }}>
        <Link href="/profile"
          className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-[12px] text-[var(--text3)] no-underline hover:text-[var(--text)] transition-all">
          ← Мой профиль
        </Link>
      </div>
    </aside>
  );
}
