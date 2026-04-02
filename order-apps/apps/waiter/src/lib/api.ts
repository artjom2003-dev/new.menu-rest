const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const RESTAURANT_ID = parseInt(import.meta.env.VITE_RESTAURANT_ID || '16271', 10);

export { API_BASE, RESTAURANT_ID };

async function request(url: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export const ordersApi = {
  getByRestaurant: () => request(`/orders/restaurant/${RESTAURANT_ID}`),
  create: (data: { tableId: number; items: { dishId: number; quantity: number; comment?: string }[]; comment?: string }) =>
    request('/orders', { method: 'POST', body: JSON.stringify({ ...data, restaurantId: RESTAURANT_ID, source: 'waiter' }) }),
  updateStatus: (orderId: number, status: string) =>
    request(`/orders/${orderId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  close: (orderId: number) => request(`/orders/${orderId}/close`, { method: 'POST' }),
};

export const tablesApi = {
  getByRestaurant: () => request(`/tables/restaurant/${RESTAURANT_ID}`),
};

export const menuApi = {
  getMenu: () => request(`/restaurants/${RESTAURANT_ID}/menu?_t=${Date.now()}`),
};
