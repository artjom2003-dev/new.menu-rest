'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/stores/auth.store';
import { useBudgetStore } from '@/stores/budget.store';
import { useFavoritesStore } from '@/stores/favorites.store';
import { useWishlistStore } from '@/stores/wishlist.store';
import { useCityStore } from '@/stores/city.store';
import { AuthModal } from '@/components/auth/AuthModal';
import { LanguageSwitcher } from './LanguageSwitcher';
import { chatApi, ownerApi, referenceApi } from '@/lib/api';

function NavLink({ href, label, isActive }: { href: string; label: string; isActive: boolean }) {
  return (
    <Link href={href}
      className="relative px-4 py-[7px] text-[13px] font-semibold no-underline rounded-full transition-all duration-300 tracking-[0.01em]"
      style={{
        color: isActive ? 'white' : 'var(--text3)',
        background: isActive ? 'var(--accent)' : 'transparent',
        boxShadow: isActive ? '0 2px 12px var(--accent-glow)' : 'none',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.color = 'var(--text)';
          (e.currentTarget as HTMLElement).style.background = 'var(--nav-hover)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.color = 'var(--text3)';
          (e.currentTarget as HTMLElement).style.background = 'transparent';
        }
      }}>
      {label}
    </Link>
  );
}

function HeaderCityPicker() {
  const { slug, name, prompted, setCity, dismiss } = useCityStore();
  const [cities, setCities] = useState<Array<{ name: string; slug: string }>>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || cities.length) return;
    referenceApi.getCities().then((r) => setCities(r.data || [])).catch(() => {});
  }, [open, cities.length]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSearch(''); }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // City already chosen — compact badge
  if (prompted && slug && name) {
    return (
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border cursor-pointer transition-all"
          style={{
            background: 'var(--accent-glow)',
            borderColor: 'var(--search-border)',
            color: 'var(--text2)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--chat-user-border)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--search-border)'; }}
        >
          <span className="text-[10px]">📍</span>
          {name}
          <span className="text-[8px] opacity-40">▾</span>
        </button>

        {open && (
          <div
            className="absolute top-[calc(100%+8px)] left-0 w-[230px] rounded-2xl border p-2 z-[1100]"
            style={{
              background: 'var(--dropdown-bg)',
              borderColor: 'var(--dropdown-border)',
              boxShadow: 'var(--dropdown-shadow)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск города..."
              className="w-full px-3 py-2 rounded-xl text-[12px] text-[var(--text)] placeholder-[var(--text3)] outline-none border font-sans mb-1.5"
              style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }}
            />
            <div className="max-h-[220px] overflow-y-auto">
              {cities
                .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()))
                .slice(0, 30)
                .map((c) => (
                  <div
                    key={c.slug}
                    onClick={() => { setCity(c.slug, c.name); setOpen(false); setSearch(''); }}
                    className="px-3 py-2 rounded-xl text-[12px] cursor-pointer transition-all"
                    style={{
                      color: c.slug === slug ? 'var(--accent)' : 'var(--text2)',
                      background: c.slug === slug ? 'var(--accent-glow)' : 'transparent',
                    }}
                  >
                    {c.name}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Dismissed — nothing
  if (prompted) return null;

  // First visit — compact prompt
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border cursor-pointer transition-all animate-pulse"
        style={{
          background: 'var(--accent-glow)',
          borderColor: 'var(--chat-user-border)',
          color: 'var(--accent)',
          animationDuration: '3s',
        }}
      >
        <span className="text-[10px]">📍</span>
        Выбрать город
      </button>

      {open && (
        <div
          className="absolute top-[calc(100%+8px)] left-0 w-[260px] rounded-2xl border p-3 z-[1100]"
          style={{
            background: 'var(--dropdown-bg)',
            borderColor: 'var(--search-border)',
            boxShadow: 'var(--dropdown-shadow)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-semibold text-[var(--text)]">📍 Ваш город</span>
            <button
              onClick={(e) => { e.stopPropagation(); dismiss(); setOpen(false); }}
              className="text-[12px] text-[var(--text3)] hover:text-[var(--text)] cursor-pointer bg-transparent border-none p-0"
            >
              ✕
            </button>
          </div>
          <p className="text-[10px] text-[var(--text3)] mb-2.5 leading-snug">
            Укажите город для рекомендаций и каталога
          </p>

          {/* Quick picks */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {[
              { slug: 'moscow', name: 'Москва' },
              { slug: 'saint-petersburg', name: 'СПб' },
              { slug: 'kazan', name: 'Казань' },
              { slug: 'novosibirsk', name: 'Новосибирск' },
            ].map((c) => (
              <button
                key={c.slug}
                onClick={() => { setCity(c.slug, c.name === 'СПб' ? 'Санкт-Петербург' : c.name); setOpen(false); }}
                className="px-2.5 py-1 rounded-full text-[10px] font-medium border cursor-pointer transition-all"
                style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)', color: 'var(--text2)' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--chat-user-border)'; e.currentTarget.style.color = 'var(--accent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.color = 'var(--text2)'; }}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Search */}
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (!cities.length) referenceApi.getCities().then((r) => setCities(r.data || [])).catch(() => {});
            }}
            onFocus={() => {
              if (!cities.length) referenceApi.getCities().then((r) => setCities(r.data || [])).catch(() => {});
            }}
            placeholder="Другой город..."
            className="w-full px-3 py-1.5 rounded-xl text-[11px] text-[var(--text)] placeholder-[var(--text3)] outline-none border font-sans"
            style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }}
          />
          {search && cities.length > 0 && (
            <div className="max-h-[140px] overflow-y-auto mt-1.5 rounded-xl border p-1"
              style={{ background: 'var(--bg3)', borderColor: 'var(--card-border)' }}>
              {cities
                .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
                .slice(0, 20)
                .map((c) => (
                  <div
                    key={c.slug}
                    onClick={() => { setCity(c.slug, c.name); setOpen(false); setSearch(''); }}
                    className="px-3 py-1.5 rounded-lg text-[11px] cursor-pointer text-[var(--text2)] hover:text-[var(--accent)] hover:bg-[var(--bg2)] transition-all"
                  >
                    {c.name}
                  </div>
                ))}
              {cities.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())).length === 0 && (
                <div className="px-3 py-1.5 text-[10px] text-[var(--text3)]">Не найдено</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const { isLoggedIn, user } = useAuthStore();
  const { toggle: toggleCalc } = useBudgetStore();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('header');

  const loadFavorites = useFavoritesStore(s => s.load);
  const favLoaded = useFavoritesStore(s => s.loaded);
  const loadWishlist = useWishlistStore(s => s.load);
  const wishlistLoaded = useWishlistStore(s => s.loaded);
  const [chatUnread, setChatUnread] = useState(0);
  const [ownerSlug, setOwnerSlug] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    if (isLoggedIn && !favLoaded) loadFavorites();
    if (isLoggedIn && !wishlistLoaded) loadWishlist();
  }, [isLoggedIn, favLoaded, loadFavorites, wishlistLoaded, loadWishlist]);

  useEffect(() => {
    if (!isLoggedIn) { setChatUnread(0); return; }
    chatApi.getUnreadCount()
      .then(r => setChatUnread(r.data?.count || 0))
      .catch(() => {});
    const interval = setInterval(() => {
      chatApi.getUnreadCount()
        .then(r => setChatUnread(r.data?.count || 0))
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  const isOwner = user?.role === 'owner' || user?.role === 'admin';

  useEffect(() => {
    if (!isOwner || !isLoggedIn) { setOwnerSlug(null); return; }
    ownerApi.getMyRestaurant()
      .then(r => setOwnerSlug(r.data?.slug || null))
      .catch(() => {});
  }, [isOwner, isLoggedIn]);

  const isBlogActive = pathname?.startsWith('/blog');

  const GUEST_NAV = [
    { href: '/restaurants', label: t('restaurants') },
    { href: '/features', label: t('forGuests') },
    { href: '/loyalty', label: t('loyalty') },
    { href: '/quiz', label: 'Гастропрофиль' },
  ];

  const NAV_ITEMS = isOwner
    ? [...GUEST_NAV.filter(i => i.href !== '/loyalty'), { href: '/marketplace', label: t('ownerVacancies') || 'Вакансии и поставщики' }, { href: '/owner/services', label: t('ownerServices') }]
    : GUEST_NAV;

  const BLOG_ITEMS = [
    { href: '/blog?tab=articles', label: t('blogArticles') },
    { href: '/blog?tab=events', label: t('blogEvents') },
    { href: '/blog?tab=promos', label: t('blogPromos') },
    { href: '/blog?tab=news', label: t('blogNews') },
  ];

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-[1000] h-[64px] flex items-center px-10 transition-all duration-[400ms]"
        style={{
          background: scrolled ? 'var(--header-bg-scroll)' : 'var(--header-bg)',
          backdropFilter: 'blur(40px) saturate(1.4)',
          borderBottom: `1px solid ${scrolled ? 'var(--header-border)' : 'transparent'}`,
          boxShadow: scrolled ? '0 4px 24px rgba(0,0,0,0.12)' : 'none',
        }}>
        <div className="w-full flex items-center justify-between">
          {/* Left: Language + City + Logo */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <HeaderCityPicker />

            <Link href="/" className="font-serif text-[26px] font-bold text-[var(--text)] no-underline tracking-[-0.03em] flex items-center gap-2.5 group">
              <span className="w-9 h-9 rounded-[10px] flex items-center justify-center text-[12px] font-black tracking-tight transition-transform duration-300 group-hover:scale-110"
                style={{ background: 'linear-gradient(135deg, var(--accent), #D44A20)', color: 'white', boxShadow: '0 2px 8px var(--accent-glow)' }}>
                MR
              </span>
              <span>Menu-<b style={{ color: 'var(--accent)', fontWeight: 900 }}>Rest</b></span>
            </Link>
          </div>

          {/* Nav — pill container */}
          <nav className="flex gap-0.5 max-sm:hidden items-center rounded-full px-1 py-1"
            style={{ background: 'var(--nav-bg)', border: '1px solid var(--nav-border)' }}>
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                isActive={pathname === item.href}
              />
            ))}

            {/* Blog dropdown — only for guests */}
            {!isOwner && (
              <div className="relative group">
                <button
                  className="relative px-4 py-[7px] text-[13px] font-semibold rounded-full flex items-center gap-1.5 transition-all duration-300 border-none cursor-pointer tracking-[0.01em]"
                  style={{
                    color: isBlogActive ? 'white' : 'var(--text3)',
                    background: isBlogActive ? 'var(--accent)' : 'transparent',
                    boxShadow: isBlogActive ? '0 2px 12px var(--accent-glow)' : 'none',
                  }}>
                  {t('blog')}
                  <svg width="10" height="10" viewBox="0 0 10 10" className="opacity-40 group-hover:opacity-80 transition-opacity">
                    <path d="M2.5 4L5 6.5L7.5 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="rounded-2xl border p-2 min-w-[170px]"
                    style={{ background: 'var(--dropdown-bg)', borderColor: 'var(--dropdown-border)', boxShadow: 'var(--dropdown-shadow)', backdropFilter: 'blur(20px)' }}>
                    {BLOG_ITEMS.map((item) => (
                      <Link key={item.href} href={item.href}
                        className="flex items-center px-3.5 py-2.5 rounded-xl text-[13px] text-[var(--text3)] no-underline transition-all duration-200 hover:bg-[var(--nav-hover)] hover:text-[var(--text)]">
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Owner: creative "My Restaurant" button */}
            {isOwner && mounted && (
              <button
                onClick={() => router.push('/owner')}
                className="relative px-5 py-[7px] text-[13px] font-bold rounded-full transition-all duration-300 tracking-[0.01em] overflow-hidden group/mybtn border-none cursor-pointer"
                style={{
                  background: pathname.startsWith('/owner')
                    ? 'linear-gradient(135deg, #0d9488, #14b8a6, #2dd4bf)'
                    : 'linear-gradient(135deg, rgba(45,212,191,0.12), rgba(20,184,166,0.06))',
                  color: pathname.startsWith('/owner') ? '#fff' : 'var(--teal)',
                  boxShadow: pathname.startsWith('/owner')
                    ? '0 0 20px rgba(45,212,191,0.4), inset 0 1px 0 rgba(255,255,255,0.15)'
                    : 'none',
                  border: pathname.startsWith('/owner') ? 'none' : '1px solid rgba(45,212,191,0.2)',
                }}
                onMouseEnter={(e) => {
                  if (!pathname.startsWith('/owner')) {
                    const el = e.currentTarget;
                    el.style.background = 'linear-gradient(135deg, rgba(45,212,191,0.2), rgba(20,184,166,0.12))';
                    el.style.borderColor = 'rgba(45,212,191,0.4)';
                    el.style.boxShadow = '0 0 16px rgba(45,212,191,0.15)';
                    el.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!pathname.startsWith('/owner')) {
                    const el = e.currentTarget;
                    el.style.background = 'linear-gradient(135deg, rgba(45,212,191,0.12), rgba(20,184,166,0.06))';
                    el.style.borderColor = 'rgba(45,212,191,0.2)';
                    el.style.boxShadow = 'none';
                    el.style.transform = 'none';
                  }
                }}>
                <span className="relative z-10 flex items-center gap-1.5">
                  <span className="inline-block transition-transform duration-300 group-hover/mybtn:scale-110">🏪</span>
                  {t('ownerMyRestaurant')}
                </span>
                {pathname === '/profile' && (
                  <span className="absolute inset-0 rounded-full opacity-30 animate-pulse"
                    style={{ background: 'linear-gradient(135deg, transparent, rgba(255,255,255,0.2), transparent)' }} />
                )}
              </button>
            )}

          </nav>

          {/* Right */}
          <div className="flex gap-2.5 items-center">
            {/* Budget calc — guests only */}
            {!isOwner && (
              <button
                onClick={toggleCalc}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-semibold border transition-all cursor-pointer"
                style={{ background: 'var(--glass)', color: 'var(--text2)', borderColor: 'var(--glass-border)', backdropFilter: 'blur(8px)' }}>
                🍽️ {t('budgetCalc')}
              </button>
            )}

            {/* Open on site — owners only */}
            {isOwner && mounted && ownerSlug && (
              <Link
                href={`/restaurants/${ownerSlug}`}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-semibold no-underline transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, rgba(20,184,166,0.12), rgba(20,184,166,0.04))',
                  color: 'var(--teal)',
                  border: '1px solid rgba(20,184,166,0.25)',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = 'linear-gradient(135deg, rgba(20,184,166,0.2), rgba(20,184,166,0.08))';
                  el.style.borderColor = 'rgba(20,184,166,0.45)';
                  el.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = 'linear-gradient(135deg, rgba(20,184,166,0.12), rgba(20,184,166,0.04))';
                  el.style.borderColor = 'rgba(20,184,166,0.25)';
                  el.style.transform = 'none';
                }}>
                Открыть на сайте
              </Link>
            )}

            {/* Chat — guests only */}
            {mounted && isLoggedIn && !isOwner && (
              <Link
                href="/chat"
                className="relative flex items-center justify-center w-[36px] h-[36px] rounded-full transition-all no-underline"
                style={{
                  background: pathname === '/chat' ? 'var(--search-border)' : 'var(--glass)',
                  border: `1px solid ${pathname === '/chat' ? 'var(--accent)' : 'var(--glass-border)'}`,
                }}
                onMouseEnter={(e) => {
                  if (pathname !== '/chat') {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
                    (e.currentTarget as HTMLElement).style.background = 'var(--accent-glow)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (pathname !== '/chat') {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--glass-border)';
                    (e.currentTarget as HTMLElement).style.background = 'var(--glass)';
                  }
                }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={pathname === '/chat' ? 'var(--accent)' : 'var(--text2)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
                {chatUnread > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    background: 'var(--accent)',
                    color: 'white',
                    fontSize: 10,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 5px',
                    boxShadow: '0 2px 8px var(--accent-glow)',
                  }}>
                    {chatUnread > 99 ? '99+' : chatUnread}
                  </span>
                )}
              </Link>
            )}

            {/* Auth / Profile */}
            {mounted && isLoggedIn ? (
              !isOwner && (
                <Link
                  href="/profile"
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-semibold border transition-all no-underline"
                  style={{ background: 'var(--glass)', color: 'var(--text2)', borderColor: 'var(--glass-border)' }}>
                  👤 {user?.name?.split(' ')[0] || t('profile')}
                </Link>
              )
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-semibold border transition-all cursor-pointer"
                style={{ background: 'var(--glass)', color: 'var(--text2)', borderColor: 'var(--glass-border)' }}>
                {t('login')}
              </button>
            )}

            {/* CTA: guests = Book, owners = Logout */}
            {isOwner ? (
              <button
                onClick={() => {
                  useAuthStore.getState().logout();
                  localStorage.removeItem('access_token');
                  window.location.href = '/';
                }}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-semibold no-underline cursor-pointer transition-all border"
                style={{
                  background: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.04))',
                  color: '#f87171',
                  borderColor: 'rgba(239,68,68,0.3)',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.08))';
                  el.style.borderColor = 'rgba(239,68,68,0.5)';
                  el.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.04))';
                  el.style.borderColor = 'rgba(239,68,68,0.3)';
                  el.style.transform = 'none';
                }}>
                {t('logout')}
              </button>
            ) : (
              <Link
                href="/restaurants"
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-full text-[13px] font-semibold text-white no-underline cursor-pointer transition-all"
                style={{ background: 'var(--accent)', boxShadow: '0 0 20px var(--accent-glow)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 0 40px var(--accent-glow), 0 8px 32px var(--chat-user-border)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'none';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px var(--accent-glow)';
                }}>
                {t('book')}
              </Link>
            )}
          </div>
        </div>
      </header>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      {/* Fixed theme toggle — bottom right */}
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="fixed bottom-6 right-6 z-[999] w-11 h-11 rounded-full flex items-center justify-center text-[16px] transition-all duration-300 border cursor-pointer"
        style={{
          background: 'var(--bg2)',
          borderColor: 'var(--card-border)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(12px)',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
          (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px var(--accent-glow)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--card-border)';
          (e.currentTarget as HTMLElement).style.transform = 'none';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
        }}>
        {!mounted ? '🌙' : theme === 'dark' ? '🌙' : '☀️'}
      </button>
    </>
  );
}
