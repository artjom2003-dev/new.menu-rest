'use client';

import { useEffect, useRef, useCallback } from 'react';
import {
  useAccessibilityStore,
  FontSize,
  ColorScheme,
  Spacing,
} from '@/stores/accessibility.store';

const FONT_SIZES: { value: FontSize; label: string }[] = [
  { value: 'normal', label: 'A' },
  { value: 'large', label: 'A+' },
  { value: 'xlarge', label: 'A++' },
];

const COLOR_SCHEMES: { value: ColorScheme; bg: string; fg: string }[] = [
  { value: 'default', bg: '#333', fg: '#fff' },
  { value: 'white-on-black', bg: '#000', fg: '#fff' },
  { value: 'black-on-white', bg: '#fff', fg: '#000' },
  { value: 'blue', bg: '#063462', fg: '#8CADD6' },
  { value: 'beige', bg: '#F7F3D6', fg: '#4D4B43' },
];

const SPACINGS: { value: Spacing; label: string }[] = [
  { value: 'normal', label: 'Обычный' },
  { value: 'medium', label: 'Средний' },
  { value: 'large', label: 'Большой' },
];

function panelColors(cs: ColorScheme) {
  switch (cs) {
    case 'white-on-black': return { bg: '#111', fg: '#fff', border: '#444' };
    case 'black-on-white': return { bg: '#f0f0f0', fg: '#000', border: '#bbb' };
    case 'blue': return { bg: '#0a2a4a', fg: '#8CADD6', border: '#3a6d9e' };
    case 'beige': return { bg: '#f0ecce', fg: '#4D4B43', border: '#B8B5A0' };
    default: return { bg: 'var(--bg2)', fg: 'var(--text)', border: 'rgba(128,128,128,0.3)' };
  }
}

/** Applies a11y CSS classes to <html> */
function useA11yCSSClasses() {
  const { enabled, fontSize, colorScheme, letterSpacing, lineHeight, hideImages } =
    useAccessibilityStore();

  useEffect(() => {
    const html = document.documentElement;
    const toRemove: string[] = [];
    html.classList.forEach((cls) => {
      if (cls.startsWith('a11y-')) toRemove.push(cls);
    });
    toRemove.forEach((cls) => html.classList.remove(cls));

    if (!enabled) {
      html.style.removeProperty('--a11y-panel-h');
      return;
    }

    html.classList.add('a11y-enabled');
    if (fontSize !== 'normal') html.classList.add(`a11y-font-${fontSize}`);
    if (colorScheme !== 'default') html.classList.add(`a11y-color-${colorScheme}`);
    if (letterSpacing !== 'normal') html.classList.add(`a11y-ls-${letterSpacing}`);
    if (lineHeight !== 'normal') html.classList.add(`a11y-lh-${lineHeight}`);
    if (hideImages) html.classList.add('a11y-no-images');
  }, [enabled, fontSize, colorScheme, letterSpacing, lineHeight, hideImages]);
}

/** Measures panel height and sets CSS var on <html> */
function usePanelHeight(ref: React.RefObject<HTMLDivElement | null>, enabled: boolean) {
  const update = useCallback(() => {
    if (!ref.current) return;
    const h = ref.current.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--a11y-panel-h', `${h}px`);
  }, [ref]);

  useEffect(() => {
    if (!enabled || !ref.current) {
      document.documentElement.style.removeProperty('--a11y-panel-h');
      return;
    }

    update();

    const ro = new ResizeObserver(update);
    ro.observe(ref.current);
    window.addEventListener('resize', update);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
      document.documentElement.style.removeProperty('--a11y-panel-h');
    };
  }, [enabled, ref, update]);
}

function Btn({
  active,
  onClick,
  children,
  style,
  colors,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
  colors: { fg: string; border: string };
}) {
  return (
    <button
      onClick={onClick}
      className="px-2 py-1 rounded text-[12px] font-medium cursor-pointer"
      style={{
        background: active ? `${colors.fg}22` : 'transparent',
        color: colors.fg,
        border: `1.5px solid ${active ? colors.fg : colors.border}`,
        fontWeight: active ? 700 : 400,
        ...style,
      }}>
      {children}
    </button>
  );
}

export function AccessibilityPanel() {
  const {
    enabled,
    fontSize,
    colorScheme,
    letterSpacing,
    lineHeight,
    hideImages,
    setFontSize,
    setColorScheme,
    setLetterSpacing,
    setLineHeight,
    setHideImages,
    reset,
  } = useAccessibilityStore();

  useA11yCSSClasses();

  const panelRef = useRef<HTMLDivElement>(null);
  usePanelHeight(panelRef, enabled);

  if (!enabled) return null;

  const c = panelColors(colorScheme);

  return (
    <div
      ref={panelRef}
      data-a11y-panel
      className="fixed top-0 left-0 right-0 z-[1100]"
      style={{ background: c.bg, color: c.fg, borderBottom: `1px solid ${c.border}` }}>
      <div className="max-w-[1400px] mx-auto px-6 max-sm:px-3 py-2.5 max-sm:py-2">
        {/* Top row: title + buttons */}
        <div className="flex items-center justify-between gap-3 mb-2 max-sm:mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <svg data-a11y-keep width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c.fg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span className="text-[14px] max-sm:text-[12px] font-bold truncate" style={{ color: c.fg }}>
              Версия для слабовидящих
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={reset}
              className="px-3 py-1 rounded text-[11px] font-semibold cursor-pointer"
              style={{ background: 'transparent', color: c.fg, border: `1px solid ${c.border}` }}>
              Сбросить
            </button>
            <button
              onClick={() => useAccessibilityStore.getState().toggle()}
              className="px-3 py-1 rounded text-[11px] font-semibold cursor-pointer"
              style={{ background: `${c.fg}15`, color: c.fg, border: `1px solid ${c.border}` }}>
              Обычная версия
            </button>
          </div>
        </div>

        {/* Controls row */}
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 items-center">
          {/* Font size */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold opacity-60 mr-0.5" style={{ color: c.fg }}>Шрифт:</span>
            {FONT_SIZES.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFontSize(opt.value)}
                className="w-7 h-7 rounded flex items-center justify-center cursor-pointer"
                style={{
                  fontSize: opt.value === 'normal' ? 12 : opt.value === 'large' ? 15 : 18,
                  fontWeight: fontSize === opt.value ? 800 : 400,
                  color: c.fg,
                  background: fontSize === opt.value ? `${c.fg}20` : 'transparent',
                  border: `1.5px solid ${fontSize === opt.value ? c.fg : c.border}`,
                }}>
                {opt.label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="w-px h-5 max-sm:hidden" style={{ background: c.border }} />

          {/* Color scheme */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold opacity-60 mr-0.5" style={{ color: c.fg }}>Цвет:</span>
            {COLOR_SCHEMES.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setColorScheme(opt.value)}
                className="w-7 h-7 rounded flex items-center justify-center text-[12px] font-bold cursor-pointer"
                style={{
                  background: opt.bg,
                  color: opt.fg,
                  border: `1.5px solid ${colorScheme === opt.value ? opt.fg : 'rgba(128,128,128,0.4)'}`,
                  outline: colorScheme === opt.value ? `2px solid ${opt.fg}` : 'none',
                  outlineOffset: 1,
                }}>
                A
              </button>
            ))}
          </div>

          <div className="w-px h-5 max-sm:hidden" style={{ background: c.border }} />

          {/* Letter spacing */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold opacity-60 mr-0.5" style={{ color: c.fg }}>Буквы:</span>
            {SPACINGS.map((opt) => (
              <Btn
                key={opt.value}
                active={letterSpacing === opt.value}
                onClick={() => setLetterSpacing(opt.value)}
                colors={{ fg: c.fg, border: c.border }}
                style={{ letterSpacing: opt.value === 'normal' ? 'normal' : opt.value === 'medium' ? '2px' : '4px' }}>
                {opt.label}
              </Btn>
            ))}
          </div>

          <div className="w-px h-5 max-sm:hidden" style={{ background: c.border }} />

          {/* Line height */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold opacity-60 mr-0.5" style={{ color: c.fg }}>Строки:</span>
            {SPACINGS.map((opt) => (
              <Btn
                key={opt.value}
                active={lineHeight === opt.value}
                onClick={() => setLineHeight(opt.value)}
                colors={{ fg: c.fg, border: c.border }}>
                {opt.label}
              </Btn>
            ))}
          </div>

          <div className="w-px h-5 max-sm:hidden" style={{ background: c.border }} />

          {/* Images toggle */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold opacity-60 mr-0.5" style={{ color: c.fg }}>Картинки:</span>
            <Btn
              active={!hideImages}
              onClick={() => setHideImages(false)}
              colors={{ fg: c.fg, border: c.border }}>
              Вкл
            </Btn>
            <Btn
              active={hideImages}
              onClick={() => setHideImages(true)}
              colors={{ fg: c.fg, border: c.border }}>
              Выкл
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Eye button for header — toggles a11y mode */
export function AccessibilityToggle() {
  const { enabled, toggle } = useAccessibilityStore();

  return (
    <button
      aria-label="Версия для слабовидящих"
      title="Версия для слабовидящих"
      onClick={toggle}
      className="flex items-center justify-center w-9 h-9 rounded-full border cursor-pointer flex-shrink-0"
      style={{
        background: enabled ? 'var(--accent-glow)' : 'var(--glass)',
        borderColor: enabled ? 'var(--accent)' : 'var(--glass-border)',
      }}>
      <svg
        data-a11y-keep
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke={enabled ? 'var(--accent)' : 'var(--text3)'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </button>
  );
}
