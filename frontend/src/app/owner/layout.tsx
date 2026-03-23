'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth.store';
import { ownerApi } from '@/lib/api';
import { OwnerContext } from '@/components/owner/OwnerContext';
import type { MyRestaurant, Post } from '@/types/owner';

const NAV = [
  { href: '/owner', label: 'Дашборд', icon: '📊' },
  { href: '/owner/edit', label: 'Карточка', icon: '✏️' },
  { href: '/owner/menu', label: 'Меню', icon: '🍴' },
  { href: '/owner/posts', label: 'Публикации', icon: '📝' },
  { href: '/owner/analytics', label: 'Аналитика', icon: '📈' },
  { href: '/owner/bookings', label: 'Брони', icon: '📅' },
  { href: '/owner/reviews', label: 'Отзывы', icon: '⭐' },
  { href: '/owner/listings', label: 'Объявления', icon: '📋' },
];

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoggedIn, _hydrated } = useAuthStore();
  const [myRestaurant, setMyRestaurant] = useState<MyRestaurant | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!_hydrated) return;
    if (!isLoggedIn) { router.replace('/login'); return; }
    if (user?.role !== 'owner' && user?.role !== 'admin') { router.replace('/profile'); return; }
    let cancelled = false;
    (async () => {
      try {
        const [rRes, pRes] = await Promise.all([ownerApi.getMyRestaurant(), ownerApi.getPosts()]);
        if (cancelled) return;
        setMyRestaurant(rRes.data);
        setPosts(Array.isArray(pRes.data) ? pRes.data : []);
      } catch {}
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [_hydrated, isLoggedIn, user?.role, router]);

  if (!_hydrated || (!isLoggedIn && _hydrated)) return null;
  if (user?.role !== 'owner' && user?.role !== 'admin') return null;

  const isActive = (href: string) => href === '/owner' ? pathname === '/owner' : pathname.startsWith(href);

  return (
    <OwnerContext.Provider value={{ myRestaurant, posts, setMyRestaurant, setPosts, loading }}>
      {/* Sub-header: restaurant identity + nav */}
      <div style={{ borderBottom: '1px solid var(--card-border)', background: 'var(--bg2)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
          {/* Top row: restaurant name + link */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, background: 'linear-gradient(135deg, var(--accent), #ff8c42)', boxShadow: '0 3px 10px var(--accent-glow)' }}>
                🍽️
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{myRestaurant?.name || 'Мой ресторан'}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{myRestaurant?.address || 'Панель управления'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Link href="/profile"
                style={{ fontSize: 11, color: 'var(--text3)', textDecoration: 'none', padding: '5px 12px', borderRadius: 8, background: 'var(--bg3)' }}>
                Мой профиль
              </Link>
            </div>
          </div>

          {/* Nav tabs */}
          <div style={{ display: 'flex', gap: 2, overflowX: 'auto', paddingBottom: 0 }}>
            {NAV.map(item => {
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '8px 14px',
                    fontSize: 12, fontWeight: active ? 600 : 400,
                    color: active ? 'var(--accent)' : 'var(--text3)',
                    textDecoration: 'none',
                    borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                  }}>
                  <span style={{ fontSize: 14 }}>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px', minHeight: '60vh' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
            <div style={{ width: 36, height: 36, border: '3px solid var(--card-border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : children}
      </div>
    </OwnerContext.Provider>
  );
}
