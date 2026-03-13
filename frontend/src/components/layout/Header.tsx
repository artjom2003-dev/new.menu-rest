'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/stores/auth.store';
import { useBudgetStore } from '@/stores/budget.store';
import { useFavoritesStore } from '@/stores/favorites.store';
import { AuthModal } from '@/components/auth/AuthModal';

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const { isLoggedIn, user } = useAuthStore();
  const { toggle: toggleCalc } = useBudgetStore();

  const loadFavorites = useFavoritesStore(s => s.load);
  const favLoaded = useFavoritesStore(s => s.loaded);

  useEffect(() => {
    setMounted(true);
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    if (isLoggedIn && !favLoaded) loadFavorites();
  }, [isLoggedIn, favLoaded, loadFavorites]);

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-[1000] h-[72px] flex items-center px-10 border-b transition-all duration-[400ms]"
        style={{
          background: scrolled ? 'rgba(6,6,10,0.9)' : 'rgba(6,6,10,0.6)',
          backdropFilter: 'blur(40px) saturate(1.4)',
          borderColor: 'rgba(255,255,255,0.04)',
          boxShadow: scrolled ? '0 8px 32px rgba(0,0,0,0.4)' : 'none',
        }}>
        <div className="max-w-[1400px] w-full mx-auto flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="font-serif text-[24px] font-bold text-[var(--text)] no-underline tracking-[-0.03em]">
            menu<b style={{ color: 'var(--accent)', fontWeight: 900 }}>rest</b>
          </Link>

          {/* Nav */}
          <nav className="flex gap-0.5 max-sm:hidden items-center">
            <Link href="/restaurants" className="px-[18px] py-2 text-[13px] font-medium text-[var(--text3)] no-underline rounded-full transition-all duration-300 hover:text-[var(--text)]">
              Рестораны
            </Link>

            {/* Blog dropdown */}
            <div className="relative group">
              <Link href="/blog" className="px-[18px] py-2 text-[13px] font-medium text-[var(--text3)] no-underline rounded-full transition-all duration-300 hover:text-[var(--text)] flex items-center gap-1">
                Журнал <span className="text-[9px] opacity-50 group-hover:opacity-80 transition-opacity">▾</span>
              </Link>
              <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="rounded-[14px] border p-1.5 min-w-[180px]"
                  style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)', boxShadow: '0 16px 48px rgba(0,0,0,0.4)' }}>
                  {[
                    { href: '/blog?tab=articles', icon: '📝', label: 'Статьи' },
                    { href: '/blog?tab=events', icon: '🎭', label: 'События' },
                    { href: '/blog?tab=promos', icon: '🔥', label: 'Акции' },
                    { href: '/blog?tab=news', icon: '📢', label: 'Новости' },
                  ].map((item) => (
                    <Link key={item.href} href={item.href}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] text-[13px] text-[var(--text2)] no-underline transition-all duration-200 hover:bg-[var(--card-hover)] hover:text-[var(--text)]">
                      <span>{item.icon}</span> {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <Link href="/loyalty" className="px-[18px] py-2 text-[13px] font-medium text-[var(--text3)] no-underline rounded-full transition-all duration-300 hover:text-[var(--text)]">
              Бонусы
            </Link>
          </nav>

          {/* Right */}
          <div className="flex gap-2.5 items-center">
            {/* Theme toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-10 h-10 rounded-full flex items-center justify-center text-[15px] transition-all duration-[400ms] border cursor-pointer"
              style={{ background: 'var(--card)', borderColor: 'var(--card-border)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
                (e.currentTarget as HTMLElement).style.background = 'var(--accent-glow)';
                (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = '';
                (e.currentTarget as HTMLElement).style.background = '';
                (e.currentTarget as HTMLElement).style.transform = '';
              }}>
              {!mounted ? '🌙' : theme === 'dark' ? '🌙' : '☀️'}
            </button>

            {/* Budget calc */}
            <button
              onClick={toggleCalc}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-semibold border transition-all cursor-pointer"
              style={{ background: 'var(--glass)', color: 'var(--text2)', borderColor: 'var(--glass-border)', backdropFilter: 'blur(8px)' }}>
              🍽️ Хватит на ужин?
            </button>

            {/* Auth */}
            {mounted && isLoggedIn ? (
              <Link
                href="/profile"
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-semibold border transition-all no-underline"
                style={{ background: 'var(--glass)', color: 'var(--text2)', borderColor: 'var(--glass-border)' }}>
                👤 {user?.name?.split(' ')[0] || 'Профиль'}
              </Link>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-semibold border transition-all cursor-pointer"
                style={{ background: 'var(--glass)', color: 'var(--text2)', borderColor: 'var(--glass-border)' }}>
                Войти
              </button>
            )}

            <Link
              href="/restaurants"
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-full text-[13px] font-semibold text-white no-underline cursor-pointer transition-all"
              style={{ background: 'var(--accent)', boxShadow: '0 0 20px var(--accent-glow)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 0 40px var(--accent-glow), 0 8px 32px rgba(255,92,40,0.3)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = '';
                (e.currentTarget as HTMLElement).style.boxShadow = '';
              }}>
              Забронировать
            </Link>
          </div>
        </div>
      </header>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
