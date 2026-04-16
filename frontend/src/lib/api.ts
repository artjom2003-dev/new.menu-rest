import axios from 'axios';
import { useAuthStore } from '@/stores/auth.store';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token — access_token is set synchronously on login, so it's always fresh
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    // Primary: access_token key (written synchronously in setUser, always up-to-date)
    let token: string | null = localStorage.getItem('access_token');
    // Fallback: Zustand persisted state (may lag behind after login due to async persist)
    if (!token) {
      try {
        const stored = localStorage.getItem('menurest-auth');
        if (stored) {
          const parsed = JSON.parse(stored);
          token = parsed?.state?.accessToken || null;
        }
      } catch {}
    }
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 → clear all auth state and redirect (skip auth endpoints like login/register)
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const url = error.config?.url || '';
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register')
      || url.includes('/auth/forgot-password') || url.includes('/auth/reset-password');

    if (error.response?.status === 401 && !isAuthEndpoint) {
      if (typeof window !== 'undefined') {
        // Clear all auth state: localStorage, cookie, and in-memory zustand store
        localStorage.removeItem('menurest-auth');
        localStorage.removeItem('menurest-gastro');
        localStorage.removeItem('access_token');
        document.cookie = 'access_token=; path=/; max-age=0';
        // Clear zustand in-memory state to prevent stale user showing
        useAuthStore.getState().logout();
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

// ─── Restaurants ──────────────────────────────────────────
export const restaurantApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/restaurants', { params }),
  getBySlug: (slug: string) =>
    api.get(`/restaurants/${slug}`),
  create: (data: unknown) => api.post('/restaurants', data),
  update: (id: number, data: unknown) => api.patch(`/restaurants/${id}`, data),
  delete: (id: number) => api.delete(`/restaurants/${id}`),
};

// ─── Photos ──────────────────────────────────────────────
export const photoApi = {
  upload: (restaurantId: number, file: File, isCover = false) => {
    const form = new FormData();
    form.append('file', file);
    form.append('isCover', String(isCover));
    return api.post(`/restaurants/${restaurantId}/photos`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  delete: (restaurantId: number, photoId: number) =>
    api.delete(`/restaurants/${restaurantId}/photos/${photoId}`),
  setCover: (restaurantId: number, photoId: number) =>
    api.patch(`/restaurants/${restaurantId}/photos/${photoId}/cover`),
};

// ─── Search ───────────────────────────────────────────────
export const searchApi = {
  search: (params: Record<string, unknown>) =>
    api.get('/search', { params }),
  autocomplete: (q: string) =>
    api.get('/search/autocomplete', { params: { q } }),
  aiSearch: (query: string) =>
    api.post('/search/ai', { query }),
};

// ─── Auth ─────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: { name: string; email: string; password: string; city?: string; referralCode?: string }) =>
    api.post('/auth/register', data),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  resetPassword: (data: { email: string; code: string; newPassword: string }) =>
    api.post('/auth/reset-password', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/users/me'),
};

// ─── User ─────────────────────────────────────────────────
export const userApi = {
  getMe: () => api.get('/users/me'),
  updateMe: (data: unknown) => api.patch('/users/me', data),
  getFavorites: () => api.get('/users/me/favorites'),
  toggleFavorite: (restaurantId: number) =>
    api.post('/users/me/favorites', { restaurantId }),
  updateAllergens: (allergenIds: number[]) =>
    api.put('/users/me/allergens', { allergenIds }),
  uploadAvatar: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/users/me/avatar', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteAccount: () => api.delete('/users/me'),
  getPublicProfile: (id: number) => api.get(`/users/${id}/profile`),
  getWishlist: () => api.get('/users/me/wishlist'),
  toggleWishlist: (restaurantId: number) =>
    api.post('/users/me/wishlist', { restaurantId }),
  getWishlistUsers: (restaurantId: number) =>
    api.get(`/restaurants/${restaurantId}/wishlist-users`),
};

// ─── Owner: My Restaurant ────────────────────────────────
export const ownerApi = {
  getMyRestaurant: () => api.get('/users/me/restaurant'),
  updateMyRestaurant: (data: Record<string, unknown>) => api.patch('/users/me/restaurant', data),
  getPosts: () => api.get('/users/me/restaurant/posts'),
  createPost: (data: { title: string; body: string; category: string }) =>
    api.post('/users/me/restaurant/posts', data),
  getListings: () => api.get('/users/me/restaurant/listings'),
  createListing: (data: { type: string; title: string; description?: string; category?: string; salary?: string; contactInfo?: string }) =>
    api.post('/users/me/restaurant/listings', data),
  deleteListing: (id: number) => api.delete(`/users/me/restaurant/listings/${id}`),
  // Working hours
  updateWorkingHours: (hours: Array<{ dayOfWeek: number; openTime: string | null; closeTime: string | null; isClosed: boolean }>) =>
    api.put('/users/me/restaurant/working-hours', { hours }),
  // Features
  updateFeatures: (featureIds: number[]) =>
    api.put('/users/me/restaurant/features', { featureIds }),
  // Menu
  getMenu: () => api.get('/users/me/restaurant/menu'),
  createDish: (data: { name: string; description?: string; composition?: string; categoryName?: string; price?: number; weightGrams?: number; volumeMl?: number; calories?: number; protein?: number; fat?: number; carbs?: number }) =>
    api.post('/users/me/restaurant/menu/dishes', data),
  updateDish: (id: number, data: Record<string, unknown>) =>
    api.patch(`/users/me/restaurant/menu/dishes/${id}`, data),
  deleteDish: (id: number) =>
    api.delete(`/users/me/restaurant/menu/dishes/${id}`),
  uploadDishPhoto: (id: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/users/me/restaurant/menu/dishes/${id}/photo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadMenuPdf: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/users/me/restaurant/menu/upload-pdf', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ─── Listings (public) ──────────────────────────────────
export const listingApi = {
  getPublic: (type?: string) => api.get('/listings', { params: type ? { type } : {} }),
};

// ─── Menu ─────────────────────────────────────────────────
export const menuApi = {
  getMenu: (restaurantId: number) =>
    api.get(`/restaurants/${restaurantId}/menu`),
};

// ─── Bookings ─────────────────────────────────────────────
export const bookingApi = {
  create: (data: unknown) => api.post('/bookings', data),
  getMyBookings: () => api.get('/bookings/my'),
  getRestaurantBookings: (restaurantId: number) =>
    api.get(`/bookings/restaurant/${restaurantId}`),
};

// ─── Reviews ──────────────────────────────────────────────
export const reviewApi = {
  getByRestaurant: (restaurantId: number, page = 1) =>
    api.get(`/reviews/restaurant/${restaurantId}`, { params: { page } }),
  create: (data: unknown) =>
    api.post('/reviews', data),
};

// ─── Loyalty ──────────────────────────────────────────────
export const loyaltyApi = {
  getStatus: () => api.get('/loyalty/status'),
  getLeaderboard: (limit = 10) => api.get('/loyalty/leaderboard', { params: { limit } }),
  getWeeklyLeaderboard: (limit = 10) => api.get('/loyalty/leaderboard/weekly', { params: { limit } }),
  getCommunityStats: () => api.get('/loyalty/stats'),
  redeemPoints: (data: { points: number; restaurantId: number; orderTotal: number }) =>
    api.post('/loyalty/redeem', data),
};

// ─── Chat ────────────────────────────────────────────────
export const chatApi = {
  getConversations: () => api.get('/chat/conversations'),
  createConversation: (userId: number) => api.post('/chat/conversations', { userId }),
  getMessages: (convId: number, page?: number) =>
    api.get(`/chat/conversations/${convId}/messages`, { params: { page } }),
  sendMessage: (convId: number, text: string) =>
    api.post(`/chat/conversations/${convId}/messages`, { text }),
  markRead: (convId: number) => api.patch(`/chat/conversations/${convId}/read`),
  getUnreadCount: () => api.get('/chat/unread-count'),
  renameConversation: (convId: number, name: string) =>
    api.patch(`/chat/conversations/${convId}/name`, { name }),
};

// ─── Pick Session (совместный выбор) ─────────────────────
export const pickSessionApi = {
  create: (data: { conversationId: number; mode: string; filters?: Record<string, unknown>; restaurantIds?: number[] }) =>
    api.post('/pick-sessions', data),
  getActive: (conversationId: number) =>
    api.get('/pick-sessions/active', { params: { conversationId } }),
  getSession: (id: number) => api.get(`/pick-sessions/${id}`),
  getNextCard: (id: number) => api.get(`/pick-sessions/${id}/next-card`),
  getRestaurants: (id: number) => api.get(`/pick-sessions/${id}/restaurants`),
  submitVote: (id: number, restaurantId: number, reaction: string) =>
    api.post(`/pick-sessions/${id}/votes`, { restaurantId, reaction }),
  getResults: (id: number) => api.get(`/pick-sessions/${id}/results`),
  complete: (id: number) => api.patch(`/pick-sessions/${id}/complete`),
  cancel: (id: number) => api.patch(`/pick-sessions/${id}/cancel`),
};

// ─── Companions (Компания) ──────────────────────────────
export const companionApi = {
  getMyCompanions: () => api.get('/companions'),
  getPending: () => api.get('/companions/pending'),
  getStatus: (userId: number) => api.get(`/companions/status/${userId}`),
  invite: (userId: number) => api.post('/companions/invite', { userId }),
  accept: (id: number) => api.patch(`/companions/${id}/accept`),
  decline: (id: number) => api.patch(`/companions/${id}/decline`),
  remove: (id: number) => api.delete(`/companions/${id}`),
  search: (q: string) => api.get('/companions/search', { params: { q } }),
};

// ─── Budget Calculator ───────────────────────────────────
export const budgetCalcApi = {
  calculate: (data: { restaurantId: number; dishIds: number[]; guestsCount: number; tipPercent?: number }) =>
    api.post('/budget-calc/calculate', data),
  estimate: (restaurantId: number, budget: number, guests = 1) =>
    api.get('/budget-calc/estimate', { params: { restaurantId, budget, guests } }),
};

// ─── Reference data ───────────────────────────────────────
export const referenceApi = {
  getCuisines: () => api.get('/cuisines'),
  getFeatures: (category?: string) =>
    api.get('/features', { params: category ? { category } : {} }),
  getAllergens: () => api.get('/allergens'),
  getCities: () => api.get('/cities'),
  getMetroStations: (city: string) =>
    api.get('/metro-stations', { params: { city } }),
  getDistricts: (city: string) =>
    api.get('/districts', { params: { city } }),
  getVenueTypes: () => api.get('/venue-types'),
};

// ─── Gastro Profile ──────────────────────────────────────
export const gastroApi = {
  getQuestions: () => api.get('/gastro/quiz/questions'),
  submitQuiz: (answers: Record<number, number[]>) => api.post('/gastro/quiz/submit', { answers }),
  getProfile: () => api.get('/gastro/quiz/profile'),
  getRecoRestaurants: (city?: string, limit?: number) =>
    api.get('/gastro/reco/restaurants', { params: { city, limit } }),
};

export default api;
