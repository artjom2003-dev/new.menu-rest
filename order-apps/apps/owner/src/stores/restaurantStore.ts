import { create } from 'zustand';
import { ownerApi } from '../lib/api';

interface Restaurant {
  id: number;
  name: string;
  slug: string;
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  averageBill?: number;
  priceLevel?: number;
  venueType?: string;
  photos?: Array<{ id: number; url: string; isCover: boolean }>;
  cuisines?: Array<{ id: number; name: string; slug: string }>;
  features?: Array<{ id: number; name: string; slug: string }>;
  workingHours?: Array<{ dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }>;
  city?: { id: number; name: string };
  rating?: number;
  reviewCount?: number;
}

interface Post {
  id: number;
  title: string;
  body: string;
  category: string;
  status: string;
  createdAt: string;
}

interface RestaurantState {
  restaurant: Restaurant | null;
  posts: Post[];
  loading: boolean;

  loadRestaurant: () => Promise<void>;
  loadPosts: () => Promise<void>;
  setRestaurant: (r: Restaurant) => void;
  setPosts: (p: Post[]) => void;
}

export const useRestaurantStore = create<RestaurantState>((set) => ({
  restaurant: null,
  posts: [],
  loading: false,

  loadRestaurant: async () => {
    set({ loading: true });
    try {
      const res = await ownerApi.getMyRestaurant();
      set({ restaurant: res.data, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  loadPosts: async () => {
    try {
      const res = await ownerApi.getPosts();
      set({ posts: res.data || [] });
    } catch {}
  },

  setRestaurant: (restaurant) => set({ restaurant }),
  setPosts: (posts) => set({ posts }),
}));
