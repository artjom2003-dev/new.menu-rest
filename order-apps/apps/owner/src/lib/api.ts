import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  // Try multiple sources for the token
  let token = localStorage.getItem('owner-token');
  if (!token) {
    try {
      const stored = localStorage.getItem('owner-auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        token = parsed?.state?.token || null;
        if (token) localStorage.setItem('owner-token', token);
      }
    } catch {}
  }
  if (token) config.headers.Authorization = `Bearer ${token}`;
  console.log('[API]', config.method?.toUpperCase(), config.url, token ? 'has-token' : 'NO-TOKEN');
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    console.error('[API ERROR]', error.response?.status, error.config?.url, error.response?.data);
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isAuthEndpoint = url.includes('/users/me') || url.includes('/restaurant');
      if (isAuthEndpoint) {
        localStorage.removeItem('owner-token');
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;

export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
};

export const ownerApi = {
  getMyRestaurant: () => api.get('/users/me/restaurant'),
  updateMyRestaurant: (data: Record<string, unknown>) => api.patch('/users/me/restaurant', data),
  getPosts: () => api.get('/users/me/restaurant/posts'),
  createPost: (data: Record<string, unknown>) => api.post('/users/me/restaurant/posts', data),
  deletePost: (id: number) => api.delete(`/users/me/restaurant/posts/${id}`),
  getListings: () => api.get('/users/me/restaurant/listings'),
  createListing: (data: Record<string, unknown>) => api.post('/users/me/restaurant/listings', data),
  deleteListing: (id: number) => api.delete(`/users/me/restaurant/listings/${id}`),
  updateWorkingHours: (hours: unknown[]) => api.put('/users/me/restaurant/working-hours', { hours }),
  updateFeatures: (featureIds: number[]) => api.put('/users/me/restaurant/features', { featureIds }),
  getMenu: () => api.get(`/users/me/restaurant/menu?_t=${Date.now()}`),
  createDish: (data: Record<string, unknown>) => api.post('/users/me/restaurant/menu/dishes', data),
  updateDish: (id: number, data: Record<string, unknown>) => api.patch(`/users/me/restaurant/menu/dishes/${id}`, data),
  deleteDish: (id: number) => api.delete(`/users/me/restaurant/menu/dishes/${id}`),
  uploadDishPhoto: (id: number, file: File) => {
    const form = new FormData(); form.append('file', file);
    return api.post(`/users/me/restaurant/menu/dishes/${id}/photo`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  uploadMenuPdf: (file: File) => {
    const form = new FormData(); form.append('file', file);
    return api.post('/users/me/restaurant/menu/upload-pdf', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const photoApi = {
  upload: (restaurantId: number, file: File, isCover?: boolean) => {
    const form = new FormData(); form.append('file', file); if (isCover) form.append('isCover', 'true');
    return api.post(`/restaurants/${restaurantId}/photos`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  delete: (restaurantId: number, photoId: number) => api.delete(`/restaurants/${restaurantId}/photos/${photoId}`),
  setCover: (restaurantId: number, photoId: number) => api.patch(`/restaurants/${restaurantId}/photos/${photoId}/cover`),
};

export const bookingApi = {
  getRestaurantBookings: (restaurantId: number) => api.get(`/bookings/restaurant/${restaurantId}`),
  updateStatus: (bookingId: number, status: string) => api.patch(`/bookings/${bookingId}/status`, { status }),
};

export const referenceApi = {
  getFeatures: (category?: string) => api.get(`/features${category ? `?category=${category}` : ''}`),
  getCuisines: () => api.get('/cuisines'),
};

export const emenuApi = {
  getSettings: () => api.get('/users/me/restaurant/emenu-settings'),
  saveSettings: (data: Record<string, unknown>) => api.put('/users/me/restaurant/emenu-settings', data),
};

export const reviewApi = {
  getByRestaurant: (restaurantId: number) => api.get(`/reviews/restaurant/${restaurantId}`),
};

export const chatApi = {
  getConversations: () => api.get('/chat/conversations'),
  getMessages: (convId: number, page?: number) =>
    api.get(`/chat/conversations/${convId}/messages`, { params: { page } }),
  sendMessage: (convId: number, text: string) =>
    api.post(`/chat/conversations/${convId}/messages`, { text }),
  markRead: (convId: number) =>
    api.patch(`/chat/conversations/${convId}/read`),
};
