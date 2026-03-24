'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { locales, localeNames, localeFlags, Locale } from '@/i18n/config';

export function LanguageSwitcher() {
  const currentLocale = useLocale() as Locale;
  const [open, setOpen] = useState(false);
  const [hoveredBtn, setHoveredBtn] = useState(false);
  const [hovered, setHovered] = useState<Locale | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const switchLocale = useCallback((locale: Locale) => {
    if (locale === currentLocale) { setOpen(false); return; }
    document.cookie = `locale=${locale};path=/;max-age=${365 * 24 * 60 * 60}`;
    setOpen(false);
    window.location.reload();
  }, [currentLocale]);

  const btnActive = open || hoveredBtn;

  return (
    <div ref={ref} style={{ position: 'relative', zIndex: 100 }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setHoveredBtn(true)}
        onMouseLeave={() => setHoveredBtn(false)}
        aria-label="Switch language"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '5px 10px 5px 7px',
          borderRadius: 11,
          border: `1px solid ${btnActive ? 'var(--chat-user-border)' : 'var(--glass-border)'}`,
          background: btnActive ? 'var(--accent-glow)' : 'var(--nav-bg)',
          color: btnActive ? 'var(--text)' : 'var(--text3)',
          cursor: 'pointer',
          transition: 'all 0.25s cubic-bezier(.4,0,.2,1)',
          fontFamily: 'inherit',
          lineHeight: 1,
        }}
      >
        {/* Globe */}
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke={btnActive ? 'var(--accent)' : 'currentColor'}
          strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
          style={{
            transition: 'transform 0.4s cubic-bezier(.4,0,.2,1), stroke 0.25s',
            transform: open ? 'rotate(180deg)' : 'none',
            flexShrink: 0,
          }}
        >
          <circle cx="12" cy="12" r="10" />
          <ellipse cx="12" cy="12" rx="4" ry="10" />
          <path d="M2 12h20" />
        </svg>

        <span style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.04em',
        }}>
          {currentLocale.toUpperCase()}
        </span>

        {/* Chevron */}
        <svg width="8" height="8" viewBox="0 0 8 8"
          style={{
            opacity: 0.45,
            transition: 'transform 0.25s',
            transform: open ? 'rotate(180deg)' : 'none',
          }}>
          <path d="M2 3L4 5L6 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown */}
      <div style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        left: 0,
        minWidth: 200,
        borderRadius: 16,
        border: '1px solid var(--dropdown-border)',
        background: 'var(--dropdown-bg)',
        backdropFilter: 'blur(40px) saturate(1.4)',
        boxShadow: 'var(--dropdown-shadow)',
        padding: 5,
        opacity: open ? 1 : 0,
        visibility: open ? 'visible' as const : 'hidden' as const,
        transform: open ? 'translateY(0) scale(1)' : 'translateY(-6px) scale(0.97)',
        transition: 'all 0.2s cubic-bezier(.4,0,.2,1)',
        pointerEvents: open ? 'auto' as const : 'none' as const,
        zIndex: 200,
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px 7px',
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase' as const,
          color: 'var(--text4)',
          borderBottom: '1px solid var(--card-border)',
          marginBottom: 3,
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ opacity: 0.35 }}>
            <circle cx="12" cy="12" r="10" />
            <ellipse cx="12" cy="12" rx="4" ry="10" />
            <path d="M2 12h20" />
          </svg>
          <span>Language</span>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {locales.map((locale) => {
            const isActive = locale === currentLocale;
            const isHov = locale === hovered;
            return (
              <button
                key={locale}
                onClick={() => switchLocale(locale)}
                onMouseEnter={() => setHovered(locale)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 10,
                  border: 'none',
                  background: isActive
                    ? (isHov ? 'var(--chat-user-bg)' : 'var(--accent-glow)')
                    : (isHov ? 'var(--nav-hover)' : 'transparent'),
                  color: isActive || isHov ? 'var(--text)' : 'var(--text3)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  textAlign: 'left' as const,
                  width: '100%',
                  transform: isHov ? 'translateX(2px)' : 'none',
                }}
              >
                <span style={{
                  fontSize: 17,
                  lineHeight: 1,
                  transition: 'transform 0.15s',
                  transform: isHov ? 'scale(1.2)' : 'none',
                  display: 'inline-block',
                }}>
                  {localeFlags[locale]}
                </span>
                <span style={{ flex: 1, fontWeight: 500 }}>
                  {localeNames[locale]}
                </span>
                {isActive && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
