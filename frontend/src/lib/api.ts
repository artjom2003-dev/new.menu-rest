import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token from cookie/localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 → refresh or redirect
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
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
  register: (data: { name: string; email: string; password: string; city?: string }) =>
    api.post('/auth/register', data),
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
};

export default api;
