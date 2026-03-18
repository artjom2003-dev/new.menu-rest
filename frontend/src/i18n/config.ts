export const locales = ['ru', 'en', 'zh', 'ko', 'ja', 'de', 'fr', 'es'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'ru';

export const localeNames: Record<Locale, string> = {
  ru: 'Русский',
  en: 'English',
  zh: '中文',
  ko: '한국어',
  ja: '日本語',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
};

export const localeFlags: Record<Locale, string> = {
  ru: '🇷🇺',
  en: '🇬🇧',
  zh: '🇨🇳',
  ko: '🇰🇷',
  ja: '🇯🇵',
  de: '🇩🇪',
  fr: '🇫🇷',
  es: '🇪🇸',
};
