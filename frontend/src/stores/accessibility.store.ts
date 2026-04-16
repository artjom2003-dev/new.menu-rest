import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FontSize = 'normal' | 'large' | 'xlarge';
export type ColorScheme = 'default' | 'white-on-black' | 'black-on-white' | 'blue' | 'beige';
export type Spacing = 'normal' | 'medium' | 'large';

interface AccessibilityState {
  enabled: boolean;
  fontSize: FontSize;
  colorScheme: ColorScheme;
  letterSpacing: Spacing;
  lineHeight: Spacing;
  hideImages: boolean;

  toggle: () => void;
  setFontSize: (v: FontSize) => void;
  setColorScheme: (v: ColorScheme) => void;
  setLetterSpacing: (v: Spacing) => void;
  setLineHeight: (v: Spacing) => void;
  setHideImages: (v: boolean) => void;
  reset: () => void;
}

const DEFAULTS = {
  enabled: false,
  fontSize: 'normal' as FontSize,
  colorScheme: 'default' as ColorScheme,
  letterSpacing: 'normal' as Spacing,
  lineHeight: 'normal' as Spacing,
  hideImages: false,
};

export const useAccessibilityStore = create<AccessibilityState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      toggle: () => set((s) => {
        if (s.enabled) return { ...DEFAULTS };
        return { enabled: true };
      }),
      setFontSize: (fontSize) => set({ fontSize }),
      setColorScheme: (colorScheme) => set({ colorScheme }),
      setLetterSpacing: (letterSpacing) => set({ letterSpacing }),
      setLineHeight: (lineHeight) => set({ lineHeight }),
      setHideImages: (hideImages) => set({ hideImages }),
      reset: () => set({ ...DEFAULTS }),
    }),
    { name: 'menurest-a11y' },
  ),
);
