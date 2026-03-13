import { create } from 'zustand';

export interface BudgetItem {
  name: string;
  icon: string;
  price: number; // в копейках
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

interface BudgetState {
  isOpen: boolean;
  budget: number; // в рублях
  items: BudgetItem[];

  toggle: () => void;
  open: () => void;
  close: () => void;
  setBudget: (v: number) => void;
  addItem: (item: BudgetItem) => void;
  removeItem: (index: number) => void;
  clear: () => void;

  // Computed
  totalPrice: () => number;
  totalWithTips: () => number;
  totalCalories: () => number;
  remaining: () => number;
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  isOpen: false,
  budget: 5000,
  items: [],

  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  setBudget: (budget) => set({ budget }),

  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
  removeItem: (index) =>
    set((s) => ({ items: s.items.filter((_, i) => i !== index) })),
  clear: () => set({ items: [] }),

  totalPrice: () => {
    const { items } = get();
    return Math.round(items.reduce((sum, i) => sum + i.price, 0) / 100);
  },
  totalWithTips: () => {
    const total = get().totalPrice();
    return total + Math.round(total * 0.1);
  },
  totalCalories: () =>
    get().items.reduce((sum, i) => sum + i.calories, 0),
  remaining: () =>
    get().budget - get().totalWithTips(),
}));
