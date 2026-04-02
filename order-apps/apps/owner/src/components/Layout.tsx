import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useRestaurantStore } from '../stores/restaurantStore';

const NAV_ITEMS = [
  { path: '/', icon: '\u{1F4CA}', label: '\u0414\u0430\u0448\u0431\u043E\u0440\u0434' },
  { path: '/edit', icon: '\u{1F3EA}', label: '\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430' },
  { path: '/menu', icon: '\u{1F4CB}', label: '\u041C\u0435\u043D\u044E' },
  { path: '/posts', icon: '\u{1F4E3}', label: '\u041F\u0443\u0431\u043B\u0438\u043A\u0430\u0446\u0438\u0438' },
  { path: '/analytics', icon: '\u{1F4C8}', label: '\u0410\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430' },
  { path: '/bookings', icon: '\u{1F4C5}', label: '\u0411\u0440\u043E\u043D\u0438' },
  { path: '/reviews', icon: '\u2B50', label: '\u041E\u0442\u0437\u044B\u0432\u044B' },
  { path: '/messages', icon: '\uD83D\uDCAC', label: '\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F' },
  { path: '/vacancies', icon: '\u{1F465}', label: '\u0412\u0430\u043A\u0430\u043D\u0441\u0438\u0438' },
  { path: '/services', icon: '\u{1F6E0}\uFE0F', label: '\u0423\u0441\u043B\u0443\u0433\u0438' },
];

const ORDER_CHAIN_ITEMS = [
  { path: '/order-chain/emenu', icon: '\u{1F4F1}', label: '\u042D\u043B\u0435\u043A\u0442\u0440\u043E\u043D\u043D\u043E\u0435 \u043C\u0435\u043D\u044E' },
  { path: '/order-chain/waiter', icon: '\u{1F454}', label: '\u041F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u043E\u0444\u0438\u0446\u0438\u0430\u043D\u0442\u0430' },
  { path: '/order-chain/kitchen', icon: '\u{1F468}\u200D\u{1F373}', label: '\u042D\u043A\u0440\u0430\u043D \u043A\u0443\u0445\u043D\u0438' },
];

function NavSidebar({ location }: { location: { pathname: string } }) {
  const chainActive = location.pathname.startsWith('/order-chain');
  const [chainOpen, setChainOpen] = useState(chainActive);

  useEffect(() => {
    if (chainActive) setChainOpen(true);
  }, [chainActive]);

  return (
    <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
      {NAV_ITEMS.map((item) => {
        const active = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium no-underline transition-all ${
              active
                ? 'bg-primary/10 text-primary'
                : 'text-text-secondary hover:bg-surface-3 hover:text-text-primary'
            }`}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}

      {/* Order Chain — expandable */}
      <button
        onClick={() => setChainOpen(!chainOpen)}
        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
          chainActive
            ? 'bg-primary/10 text-primary'
            : 'text-text-secondary hover:bg-surface-3 hover:text-text-primary'
        }`}
      >
        <span className="flex items-center gap-3">
          <span className="text-base">{'\u{1F517}'}</span>
          Цепочка заказа
        </span>
        <span className={`text-[10px] transition-transform ${chainOpen ? 'rotate-90' : ''}`}>&#9654;</span>
      </button>
      {chainOpen && (
        <div className="ml-5 space-y-0.5">
          {ORDER_CHAIN_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-medium no-underline transition-all ${
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-muted hover:bg-surface-3 hover:text-text-primary'
                }`}
              >
                <span className="text-sm">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}

export function Layout() {
  const { user, isLoggedIn, logout } = useAuthStore();
  const { restaurant, loading, loadRestaurant, loadPosts } = useRestaurantStore();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoggedIn) { navigate('/login'); return; }
    loadRestaurant().catch((err: any) => {
      if (err?.response?.status === 401) { logout(); navigate('/login'); }
    });
    loadPosts();
  }, [isLoggedIn]);

  if (!isLoggedIn) return null;

  // Invalid session — logged in but no user data
  if (!user?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <span className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-xs font-black text-white">MR</span>
            <span className="text-xl font-bold text-text-primary">
              Menu<span className="text-primary">Rest</span>
            </span>
          </div>
          <p className="text-sm text-text-muted mb-4">Сессия истекла, войдите заново</p>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="px-6 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition"
          >
            Войти в аккаунт
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-dark-bg">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-surface border-r border-border flex flex-col">
        {/* Logo + Restaurant */}
        <div className="px-5 pt-5 pb-4 border-b border-border">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <span className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-[10px] font-black text-white">MR</span>
            <span className="text-base font-bold text-text-primary">
              Menu<span className="text-primary">Rest</span>
            </span>
          </Link>
          {restaurant && (
            <div className="mt-3 px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/10">
              <p className="text-[10px] text-text-muted uppercase tracking-wider">Ваш ресторан</p>
              <p className="text-sm font-semibold text-text-primary mt-0.5 truncate">{restaurant.name}</p>
              {restaurant.address && (
                <p className="text-[11px] text-text-muted mt-0.5 truncate">{restaurant.address}</p>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <NavSidebar location={location} />

        {/* Support */}
        <div className="px-5 py-3 border-t border-border">
          <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5">Поддержка</p>
          <a href="mailto:info@menu-rest.com" className="block text-xs text-text-secondary hover:text-primary transition no-underline truncate">info@menu-rest.com</a>
          <a href="tel:+78001234567" className="block text-xs text-text-secondary hover:text-primary transition no-underline mt-1">+7 (800) 123-45-67</a>
        </div>

        {/* User */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center text-xs font-bold text-text-secondary">
              {user?.name?.[0] || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-text-primary truncate">{user?.name}</p>
              <p className="text-[10px] text-text-muted truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="w-full mt-2 px-3 py-2.5 rounded-xl text-xs font-medium text-red-400/70 hover:text-red-400 hover:bg-red-400/10 border border-transparent hover:border-red-400/20 transition text-left flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Выйти
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1200px] mx-auto px-8 py-6">
          {loading && !restaurant ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </main>
    </div>
  );
}
