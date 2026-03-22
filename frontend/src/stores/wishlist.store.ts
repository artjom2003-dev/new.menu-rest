import { create } from 'zustand';
import { userApi } from '@/lib/api';

interface WishlistState {
  ids: Set<number>;
  loaded: boolean;

  load: () => Promise<void>;
  toggle: (restaurantId: number) => Promise<boolean>;
  isInWishlist: (restaurantId: number) => boolean;
  clear: () => void;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  ids: new Set(),
  loaded: false,

  load: async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) { set({ loaded: true }); return; }
    try {
      const res = await userApi.getWishlist();
      const items: Array<{ id: number }> = res.data || [];
      set({ ids: new Set(items.map(r => r.id)), loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  toggle: async (restaurantId: number) => {
    const { ids } = get();
    const was = ids.has(restaurantId);

    // Optimistic update
    const next = new Set(ids);
    if (was) next.delete(restaurantId);
    else next.add(restaurantId);
    set({ ids: next });

    try {
      await userApi.toggleWishlist(restaurantId);
      return !was;
    } catch {
      // Revert on error
      set({ ids });
      return was;
    }
  },

  isInWishlist: (restaurantId: number) => get().ids.has(restaurantId),

  clear: () => set({ ids: new Set(), loaded: false }),
}));
