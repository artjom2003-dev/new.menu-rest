'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem('cookie_consent');
    if (!accepted) setVisible(true);
  }, []);

  if (!visible) return null;

  const accept = () => {
    localStorage.setItem('cookie_consent', '1');
    setVisible(false);
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] border-t"
      style={{ background: 'var(--bg2)', borderColor: 'var(--card-border)' }}>
      <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between gap-4 max-sm:flex-col max-sm:items-stretch max-sm:gap-3">
        <p className="text-[13px] text-[var(--text2)] leading-relaxed m-0">
          Мы используем файлы cookies для улучшения работы сайта и персонализации.
          Продолжая использовать сайт, вы соглашаетесь с{' '}
          <Link href="/privacy" className="text-[var(--accent)] underline">
            Политикой конфиденциальности
          </Link>{' '}
          и обработкой cookies.
        </p>
        <button
          onClick={accept}
          className="px-6 py-2.5 rounded-full text-[13px] font-semibold text-white border-none cursor-pointer whitespace-nowrap shrink-0"
          style={{ background: 'var(--accent)' }}>
          Принять
        </button>
      </div>
    </div>
  );
}
