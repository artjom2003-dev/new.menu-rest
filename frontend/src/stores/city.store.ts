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

export const useCityStore = create<CityState>()(
  persist(
    (set) => ({
      slug: null,
      name: null,
      prompted: false,
      setCity: (slug, name) => set({ slug, name, prompted: true }),
      dismiss: () => set({ prompted: true }),
      clear: () => set({ slug: null, name: null, prompted: false }),
    }),
    {
      name: 'menurest-city',
    },
  ),
);
