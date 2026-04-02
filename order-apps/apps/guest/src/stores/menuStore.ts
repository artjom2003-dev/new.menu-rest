import { create } from 'zustand';
import type { MenuCategory, MenuDish } from '@menurest/shared-types';
import { MOCK_CATEGORIES, MOCK_RESTAURANT } from '../mocks/restaurant';

interface MenuState {
  restaurant: { id: number; slug: string; name: string; logo?: string } | null;
  categories: MenuCategory[];
  activeCategory: string;
  searchQuery: string;
  allergenFilter: string[];
  loading: boolean;

  loadMenu: (slug: string) => Promise<void>;
  setActiveCategory: (cat: string) => void;
  setSearchQuery: (q: string) => void;
  toggleAllergenFilter: (allergen: string) => void;
  getFilteredDishes: () => MenuDish[];
}

export const useMenuStore = create<MenuState>((set, get) => ({
  restaurant: null,
  categories: [],
  activeCategory: '',
  searchQuery: '',
  allergenFilter: [],
  loading: false,

  loadMenu: async (_slug: string) => {
    set({ loading: true });
    // TODO: replace with real API call
    await new Promise((r) => setTimeout(r, 300));
    set({
      restaurant: MOCK_RESTAURANT,
      categories: MOCK_CATEGORIES,
      activeCategory: MOCK_CATEGORIES[0]?.name || '',
      loading: false,
    });
  },

  setActiveCategory: (cat) => set({ activeCategory: cat }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  toggleAllergenFilter: (allergen) => set((s) => ({
    allergenFilter: s.allergenFilter.includes(allergen)
      ? s.allergenFilter.filter((a) => a !== allergen)
      : [...s.allergenFilter, allergen],
  })),

  getFilteredDishes: () => {
    const { categories, activeCategory, searchQuery, allergenFilter } = get();
    const cat = categories.find((c) => c.name === activeCategory);
    if (!cat) return [];
    let dishes = cat.dishes;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      dishes = dishes.filter((d) =>
        d.name.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q)
      );
    }
    if (allergenFilter.length > 0) {
      dishes = dishes.filter((d) =>
        !d.allergens || !d.allergens.some((a) => allergenFilter.includes(a))
      );
    }
    return dishes;
  },
}));
