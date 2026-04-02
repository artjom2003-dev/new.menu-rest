import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' },
});

export default api;

export const ordersApi = {
  getByRestaurant: (restaurantId: number, status?: string) =>
    api.get(`/orders/restaurant/${restaurantId}${status ? `?status=${status}` : ''}`),
  updateItemStatus: (orderId: number, itemId: number, status: string) =>
    api.patch(`/orders/${orderId}/items/${itemId}/status`, { status }),
  updateStatus: (orderId: number, status: string) =>
    api.patch(`/orders/${orderId}/status`, { status }),
};
