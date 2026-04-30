import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CityState {
  /** City slug, e.g. "moscow" */
  slug: string | null;
  /** City display name, e.g. "Москва" */
  name: string | null;
  /** Whether the user has been prompted and made a choice (including dismissal) */
  prompted: boolean;
  setCity: (slug: string, name: string) => void;
  dismiss: () => void;
  clear: () => void;
}

// Каноничные slug'и из БД (cities.seed.ts). Источник правды для всего фронта.
const CANONICAL_SLUGS = new Set([
  'moscow', 'spb', 'kazan', 'ekb', 'novosibirsk', 'sochi', 'krasnodar',
  'nnov', 'samara', 'ufa', 'rostov', 'voronezh', 'krasnoyarsk',
]);

// Миграция старых/неправильных slug'ов в localStorage. Без неё юзер с прошлым выбором
// "Санкт-Петербург" продолжит отправлять backend'у "saint-petersburg" — и поиск выдаст пустоту.
const SLUG_ALIASES: Record<string, string> = {
  'saint-petersburg': 'spb',
  'sankt-peterburg': 'spb',
  'saint_petersburg': 'spb',
  'st-petersburg': 'spb',
  'piter': 'spb',
  'yekaterinburg': 'ekb',
  'ekaterinburg': 'ekb',
  'nizhny-novgorod': 'nnov',
  'nizhniy-novgorod': 'nnov',
  'rostov-na-donu': 'rostov',
};

function normalizeSlug(slug: string | null | undefined): string | null {
  if (!slug) return null;
  const s = slug.toLowerCase().trim();
  if (CANONICAL_SLUGS.has(s)) return s;
  if (SLUG_ALIASES[s]) return SLUG_ALIASES[s];
  return null; // неизвестный slug — лучше сбросить, чем фильтровать "вникуда"
}

export const useCityStore = create<CityState>()(
  persist(
    (set) => ({
      slug: null,
      name: null,
      prompted: false,
      setCity: (slug, name) => set({ slug: normalizeSlug(slug), name, prompted: true }),
      dismiss: () => set({ prompted: true }),
      clear: () => set({ slug: null, name: null, prompted: false }),
    }),
    {
      name: 'menurest-city',
      version: 2,
      migrate: (persisted: unknown, version) => {
        const state = (persisted ?? {}) as Partial<CityState>;
        if (version < 2 && state.slug) {
          const fixed = normalizeSlug(state.slug);
          if (fixed !== state.slug) {
            return { ...state, slug: fixed, prompted: fixed ? true : false } as CityState;
          }
        }
        return state as CityState;
      },
      // Дополнительная страховка: даже если миграция не сработала (например, version был 0),
      // нормализуем slug при гидратации.
      onRehydrateStorage: () => (state) => {
        if (state?.slug) {
          const fixed = normalizeSlug(state.slug);
          if (fixed !== state.slug) state.slug = fixed;
        }
      },
    },
  ),
);
