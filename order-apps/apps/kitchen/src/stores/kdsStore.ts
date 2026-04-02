import { create } from 'zustand';
import { Order, OrderItem } from '@menurest/shared-types';
import { ordersApi } from '../lib/api';

export type KdsOrder = Order & { receivedAt: number };

interface KdsState {
  restaurantId: number | null;
  orders: KdsOrder[];
  loading: boolean;

  setConfig: (restaurantId: number) => void;
  loadOrders: () => Promise<void>;
  addOrder: (order: Order) => void;
  addItems: (orderId: number, items: OrderItem[]) => void;
  updateItemStatus: (orderId: number, itemId: number, status: string) => void;
  updateOrderStatus: (orderId: number, status: string) => void;
  removeOrder: (orderId: number) => void;
  markItemPreparing: (orderId: number, itemId: number) => Promise<void>;
  markItemReady: (orderId: number, itemId: number) => Promise<void>;
  markAllReady: (orderId: number) => Promise<void>;
}

export const useKdsStore = create<KdsState>((set, get) => ({
  restaurantId: null,
  orders: [],
  loading: false,

  setConfig: (restaurantId) => set({ restaurantId }),

  loadOrders: async () => {
    const { restaurantId } = get();
    if (!restaurantId) return;
    set({ loading: true });
    try {
      const res = await ordersApi.getByRestaurant(restaurantId);
      const activeOrders: Order[] = (res.data || []).filter(
        (o: Order) => !['paid', 'cancelled', 'served'].includes(o.status),
      );
      set({
        orders: activeOrders.map((o) => ({ ...o, receivedAt: new Date(o.createdAt).getTime() })),
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  addOrder: (order) => {
    const { orders } = get();
    if (orders.some((o) => o.id === order.id)) return;
    set({ orders: [...orders, { ...order, receivedAt: Date.now() }] });
  },

  addItems: (orderId, items) => {
    if (items.length === 0) return;
    set({
      orders: get().orders.map((o) =>
        o.id === orderId ? { ...o, items: [...o.items, ...items] } : o,
      ),
    });
  },

  updateItemStatus: (orderId, itemId, status) =>
    set({
      orders: get().orders.map((o) =>
        o.id === orderId
          ? { ...o, items: o.items.map((i) => (i.id === itemId ? { ...i, status: status as any } : i)) }
          : o,
      ),
    }),

  updateOrderStatus: (orderId, status) =>
    set({
      orders: ['paid', 'cancelled', 'served'].includes(status)
        ? get().orders.filter((o) => o.id !== orderId)
        : get().orders.map((o) => (o.id === orderId ? { ...o, status: status as any } : o)),
    }),

  removeOrder: (orderId) =>
    set({ orders: get().orders.filter((o) => o.id !== orderId) }),

  markItemPreparing: async (orderId, itemId) => {
    get().updateItemStatus(orderId, itemId, 'preparing');
    try {
      await ordersApi.updateItemStatus(orderId, itemId, 'preparing');
    } catch {
      get().updateItemStatus(orderId, itemId, 'pending');
    }
  },

  markItemReady: async (orderId, itemId) => {
    get().updateItemStatus(orderId, itemId, 'ready');
    try {
      await ordersApi.updateItemStatus(orderId, itemId, 'ready');
    } catch {
      get().updateItemStatus(orderId, itemId, 'preparing');
    }
  },

  markAllReady: async (orderId) => {
    const order = get().orders.find((o) => o.id === orderId);
    if (!order) return;
    const pending = order.items.filter((i) => i.status !== 'ready' && i.status !== 'cancelled');
    for (const item of pending) {
      get().updateItemStatus(orderId, item.id, 'ready');
      try {
        await ordersApi.updateItemStatus(orderId, item.id, 'ready');
      } catch {}
    }
    const updated = get().orders.find((o) => o.id === orderId);
    if (updated && updated.items.every((i) => i.status === 'ready' || i.status === 'cancelled')) {
      try {
        await ordersApi.updateStatus(orderId, 'ready');
      } catch {}
    }
  },
}));
