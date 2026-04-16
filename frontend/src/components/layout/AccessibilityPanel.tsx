'use client';

import { useEffect } from 'react';
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

const COLOR_SCHEMES: { value: ColorScheme; label: string; bg: string; fg: string }[] = [
  { value: 'default', label: 'По умолч.', bg: '#333', fg: '#fff' },
  { value: 'white-on-black', label: 'Белый на чёрном', bg: '#000', fg: '#fff' },
  { value: 'black-on-white', label: 'Чёрный на белом', bg: '#fff', fg: '#000' },
  { value: 'blue', label: 'Синий', bg: '#063462', fg: '#8CADD6' },
  { value: 'beige', label: 'Коричневый', bg: '#F7F3D6', fg: '#4D4B43' },
];

const SPACINGS: { value: Spacing; label: string }[] = [
  { value: 'normal', label: 'Обычный' },
  { value: 'medium', label: 'Средний' },
  { value: 'large', label: 'Большой' },
];

function PillGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  renderOption,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  renderOption?: (opt: { value: T; label: string }, active: boolean) => React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[12px] font-semibold whitespace-nowrap opacity-70">{label}:</span>
      <div className="flex gap-1">
        {options.map((opt) => {
          const active = value === opt.value;
          if (renderOption) return <span key={opt.value}>{renderOption(opt, active)}</span>;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className="px-2.5 py-1 rounded-md text-[12px] font-medium border cursor-pointer transition-all"
              style={{
                background: active ? 'currentColor' : 'transparent',
                color: active ? 'inherit' : 'inherit',
                borderColor: active ? 'currentColor' : 'rgba(128,128,128,0.3)',
                opacity: active ? 1 : 0.6,
                fontWeight: active ? 700 : 500,
                outline: active ? '2px solid currentColor' : 'none',
                outlineOffset: 1,
              }}>
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Applies a11y CSS classes to <html> and returns cleanup */
function useA11yCSSClasses() {
  const { enabled, fontSize, colorScheme, letterSpacing, lineHeight, hideImages } =
    useAccessibilityStore();

  useEffect(() => {
    const html = document.documentElement;
    // Remove all a11y classes first
    html.classList.forEach((cls) => {
      if (cls.startsWith('a11y-')) html.classList.remove(cls);
    });

    if (!enabled) return;

    html.classList.add('a11y-enabled');
    if (fontSize !== 'normal') html.classList.add(`a11y-font-${fontSize}`);
    if (colorScheme !== 'default') html.classList.add(`a11y-color-${colorScheme}`);
    if (letterSpacing !== 'normal') html.classList.add(`a11y-ls-${letterSpacing}`);
    if (lineHeight !== 'normal') html.classList.add(`a11y-lh-${lineHeight}`);
    if (hideImages) html.classList.add('a11y-no-images');
  }, [enabled, fontSize, colorScheme, letterSpacing, lineHeight, hideImages]);
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

  if (!enabled) return null;

  return (
    <div
      data-a11y-panel
      className="fixed top-0 left-0 right-0 z-[1100] border-b"
      style={{
        background: colorScheme === 'white-on-black' ? '#111' :
          colorScheme === 'black-on-white' ? '#f5f5f5' :
          colorScheme === 'blue' ? '#0a2a4a' :
          colorScheme === 'beige' ? '#f0ecce' :
          'var(--bg2)',
        color: colorScheme === 'white-on-black' ? '#fff' :
          colorScheme === 'black-on-white' ? '#000' :
          colorScheme === 'blue' ? '#8CADD6' :
          colorScheme === 'beige' ? '#4D4B43' :
          'var(--text)',
        borderColor: 'rgba(128,128,128,0.3)',
      }}>
      <div className="max-w-[1400px] mx-auto px-6 max-sm:px-3 py-3 max-sm:py-2">
        <div className="flex items-center justify-between gap-4 mb-2 max-sm:mb-1.5">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span className="text-[14px] max-sm:text-[12px] font-bold">Версия для слабовидящих</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={reset}
              className="px-3 py-1 rounded-md text-[11px] font-semibold border cursor-pointer transition-all"
              style={{ borderColor: 'rgba(128,128,128,0.3)', background: 'transparent', color: 'inherit' }}>
              Сбросить
            </button>
            <button
              onClick={() => useAccessibilityStore.getState().toggle()}
              className="px-3 py-1 rounded-md text-[11px] font-semibold border cursor-pointer transition-all"
              style={{ borderColor: 'rgba(128,128,128,0.3)', background: 'transparent', color: 'inherit' }}>
              Обычная версия
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2 max-sm:gap-x-3 max-sm:gap-y-1.5 items-center">
          {/* Font size */}
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-semibold opacity-70">Шрифт:</span>
            {FONT_SIZES.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFontSize(opt.value)}
                className="w-8 h-8 max-sm:w-7 max-sm:h-7 rounded-md flex items-center justify-center cursor-pointer border transition-all"
                style={{
                  fontSize: opt.value === 'normal' ? 13 : opt.value === 'large' ? 16 : 19,
                  fontWeight: fontSize === opt.value ? 800 : 500,
                  borderColor: fontSize === opt.value ? 'currentColor' : 'rgba(128,128,128,0.3)',
                  background: fontSize === opt.value ? 'rgba(128,128,128,0.15)' : 'transparent',
                  color: 'inherit',
                }}>
                {opt.label}
              </button>
            ))}
          </div>

          {/* Color scheme */}
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-semibold opacity-70">Цвет:</span>
            {COLOR_SCHEMES.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setColorScheme(opt.value)}
                className="w-8 h-8 max-sm:w-7 max-sm:h-7 rounded-md flex items-center justify-center text-[13px] font-bold cursor-pointer border transition-all"
                style={{
                  background: opt.bg,
                  color: opt.fg,
                  borderColor: colorScheme === opt.value ? opt.fg : 'rgba(128,128,128,0.3)',
                  outline: colorScheme === opt.value ? `2px solid ${opt.fg}` : 'none',
                  outlineOffset: 1,
                }}>
                A
              </button>
            ))}
          </div>

          {/* Letter spacing */}
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-semibold opacity-70">Буквы:</span>
            {SPACINGS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setLetterSpacing(opt.value)}
                className="px-2 py-1 rounded-md text-[11px] font-medium border cursor-pointer transition-all"
                style={{
                  letterSpacing: opt.value === 'normal' ? 'normal' : opt.value === 'medium' ? '2px' : '4px',
                  borderColor: letterSpacing === opt.value ? 'currentColor' : 'rgba(128,128,128,0.3)',
                  background: letterSpacing === opt.value ? 'rgba(128,128,128,0.15)' : 'transparent',
                  color: 'inherit',
                }}>
                {opt.label}
              </button>
            ))}
          </div>

          {/* Line height */}
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-semibold opacity-70">Интервал:</span>
            {SPACINGS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setLineHeight(opt.value)}
                className="px-2 py-1 rounded-md text-[11px] font-medium border cursor-pointer transition-all"
                style={{
                  borderColor: lineHeight === opt.value ? 'currentColor' : 'rgba(128,128,128,0.3)',
                  background: lineHeight === opt.value ? 'rgba(128,128,128,0.15)' : 'transparent',
                  color: 'inherit',
                }}>
                {opt.label}
              </button>
            ))}
          </div>

          {/* Hide images */}
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-semibold opacity-70">Картинки:</span>
            <button
              onClick={() => setHideImages(!hideImages)}
              className="px-2 py-1 rounded-md text-[11px] font-medium border cursor-pointer transition-all"
              style={{
                borderColor: hideImages ? 'currentColor' : 'rgba(128,128,128,0.3)',
                background: hideImages ? 'rgba(128,128,128,0.15)' : 'transparent',
                color: 'inherit',
              }}>
              {hideImages ? 'Скрыты' : 'Показаны'}
            </button>
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
      className="flex items-center justify-center w-9 h-9 rounded-full border cursor-pointer transition-all flex-shrink-0"
      style={{
        background: enabled ? 'var(--accent-glow)' : 'var(--glass)',
        borderColor: enabled ? 'var(--accent)' : 'var(--glass-border)',
      }}>
      <svg
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
