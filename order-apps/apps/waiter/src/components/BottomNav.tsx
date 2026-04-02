import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const TABS = [
  { path: '/floor', icon: '🏠', label: 'Зал' },
  { path: '/orders', icon: '📋', label: 'Заказы' },
  { path: '/stats', icon: '📊', label: 'Статистика' },
];

export function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#16213E]/95 backdrop-blur-lg border-t border-[#2A2A4A] px-2 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center py-2 px-4 transition ${active ? 'text-[#E8491D]' : 'text-[#6C6C80]'}`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-[10px] font-medium mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
