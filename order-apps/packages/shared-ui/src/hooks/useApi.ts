const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface RequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  token?: string | null;
}

async function request<T = any>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, token } = opts;
  const h: Record<string, string> = { 'Content-Type': 'application/json', ...headers };
  if (token) h['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: h,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as any;
  return res.json();
}

export const api = {
  get: <T = any>(path: string, token?: string | null) => request<T>(path, { token }),
  post: <T = any>(path: string, body?: any, token?: string | null) => request<T>(path, { method: 'POST', body, token }),
  patch: <T = any>(path: string, body?: any, token?: string | null) => request<T>(path, { method: 'PATCH', body, token }),
  del: <T = any>(path: string, body?: any, token?: string | null) => request<T>(path, { method: 'DELETE', body, token }),
};

// Typed API methods
export const ordersApi = {
  create: (data: any) => api.post('/orders', data),
  getById: (id: number) => api.get(`/orders/${id}`),
  getByRestaurant: (restaurantId: number, status?: string) =>
    api.get(`/orders/restaurant/${restaurantId}${status ? `?status=${status}` : ''}`),
  getByWaiter: (waiterId: number) => api.get(`/orders/waiter/${waiterId}`),
  updateStatus: (id: number, status: string) => api.patch(`/orders/${id}/status`, { status }),
  addItems: (id: number, items: any[]) => api.post(`/orders/${id}/items`, { items }),
  cancelItem: (orderId: number, itemId: number, reason: string) =>
    api.del(`/orders/${orderId}/items/${itemId}`, { reason }),
  getPreCheck: (id: number) => api.post(`/orders/${id}/check`),
  close: (id: number) => api.post(`/orders/${id}/close`),
};

export const tablesApi = {
  getByRestaurant: (restaurantId: number) => api.get(`/tables/restaurant/${restaurantId}`),
  getById: (id: number) => api.get(`/tables/${id}`),
  create: (restaurantId: number, data: any) => api.post(`/tables/restaurant/${restaurantId}`, data),
  updateStatus: (id: number, status: string) => api.patch(`/tables/${id}/status`, { status }),
  transfer: (id: number, targetTableId: number) => api.post(`/tables/${id}/transfer`, { targetTableId }),
  callWaiter: (id: number) => api.post(`/tables/${id}/call-waiter`),
  requestCheck: (id: number) => api.post(`/tables/${id}/request-check`),
};

export const staffApi = {
  auth: (restaurantId: number, pin: string) => api.post('/staff/auth', { restaurantId, pin }),
  getByRestaurant: (restaurantId: number) => api.get(`/staff/restaurant/${restaurantId}`),
  assignTable: (staffId: number, tableId: number, shiftDate: string) =>
    api.post(`/staff/${staffId}/assign-table`, { tableId, shiftDate }),
};

export const menuApi = {
  getMenu: (restaurantId: number) => api.get(`/restaurants/${restaurantId}/menu`),
  getBySlug: (slug: string) => api.get(`/restaurants/${slug}`),
};
