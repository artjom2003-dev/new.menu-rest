import { create } from 'zustand';

export interface CartItemData {
  dishId: number;
  name: string;
  price: number;
  quantity: number;
  comment?: string;
}

interface CartState {
  items: CartItemData[];
  orderComment: string;

  addItem: (dish: { id: number; name: string; price: number }) => void;
  updateQuantity: (dishId: number, quantity: number) => void;
  removeItem: (dishId: number) => void;
  setItemComment: (dishId: number, comment: string) => void;
  setOrderComment: (comment: string) => void;
  getTotal: () => number;
  getCount: () => number;
  clear: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  orderComment: '',

  addItem: (dish) => set((s) => {
    const existing = s.items.find((i) => i.dishId === dish.id);
    if (existing) {
      return { items: s.items.map((i) => i.dishId === dish.id ? { ...i, quantity: i.quantity + 1 } : i) };
    }
    return { items: [...s.items, { dishId: dish.id, name: dish.name, price: dish.price, quantity: 1 }] };
  }),

  updateQuantity: (dishId, quantity) => set((s) => ({
    items: quantity > 0
      ? s.items.map((i) => i.dishId === dishId ? { ...i, quantity } : i)
      : s.items.filter((i) => i.dishId !== dishId),
  })),

  removeItem: (dishId) => set((s) => ({ items: s.items.filter((i) => i.dishId !== dishId) })),

  setItemComment: (dishId, comment) => set((s) => ({
    items: s.items.map((i) => i.dishId === dishId ? { ...i, comment } : i),
  })),

  setOrderComment: (comment) => set({ orderComment: comment }),

  getTotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
  getCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

  clear: () => set({ items: [], orderComment: '' }),
}));
