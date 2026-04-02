import { create } from 'zustand';
import type { Order } from '@menurest/shared-types';
import { ordersApi } from '../lib/api';
import type { OrderStatus } from '@menurest/shared-types';

interface Notification {
  id: number;
  type: string;
  message: string;
  tableNumber: number;
  time: string;
}

interface OrdersState {
  orders: Order[];
  notifications: Notification[];
  loading: boolean;
  statusFilter: string | null;

  loadOrders: () => Promise<void>;
  setStatusFilter: (s: string | null) => void;
  getActiveOrders: () => Order[];
  getOrderByTable: (tableId: number) => Order | undefined;
  markItemServed: (orderId: number, itemId: number) => void;
  dismissNotification: (id: number) => void;
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: number, status: string) => void;
}

export const useOrdersStore = create<OrdersState>((set, get) => ({
  orders: [],
  notifications: [],
  loading: false,
  statusFilter: null,

  loadOrders: async () => {
    set({ loading: true });
    try {
      const data = await ordersApi.getByRestaurant();
      const orders = (data || []).filter(
        (o: Order) => !['paid', 'cancelled'].includes(o.status),
      );
      set({ orders, loading: false });
    } catch {
      set({ orders: [], loading: false });
    }
  },

  setStatusFilter: (s) => set({ statusFilter: s }),

  getActiveOrders: () => {
    const { orders, statusFilter } = get();
    const active = orders.filter((o) => !['paid', 'cancelled'].includes(o.status));
    if (statusFilter) return active.filter((o) => o.status === statusFilter);
    return active;
  },

  getOrderByTable: (tableId) => get().orders.find((o) => o.tableId === tableId && !['paid', 'cancelled'].includes(o.status)),

  markItemServed: (orderId, itemId) => set((s) => ({
    orders: s.orders.map((o) =>
      o.id === orderId
        ? { ...o, items: o.items.map((i) => (i.id === itemId ? { ...i, status: 'served' as any } : i)) }
        : o
    ),
  })),

  dismissNotification: (id) => set((s) => ({
    notifications: s.notifications.filter((n) => n.id !== id),
  })),

  addOrder: (order) => {
    const { orders, notifications } = get();
    if (orders.some((o) => o.id === order.id)) return;
    set({
      orders: [order, ...orders],
      notifications: [
        {
          id: Date.now(),
          type: 'new_order',
          message: `Новый заказ #${order.id} — Стол ${order.tableNumber}`,
          tableNumber: order.tableNumber,
          time: new Date().toISOString(),
        },
        ...notifications,
      ],
    });
  },

  updateOrderStatus: (orderId, status) => {
    if (['paid', 'cancelled'].includes(status)) {
      set({ orders: get().orders.filter((o) => o.id !== orderId) });
    } else {
      set({
        orders: get().orders.map((o) => (o.id === orderId ? { ...o, status: status as any } : o)),
      });
      if (status === 'ready') {
        const order = get().orders.find((o) => o.id === orderId);
        set({
          notifications: [
            {
              id: Date.now(),
              type: 'order_ready',
              message: `Заказ #${orderId} готов к выдаче${order ? ` — Стол ${order.tableNumber}` : ''}`,
              tableNumber: order?.tableNumber || 0,
              time: new Date().toISOString(),
            },
            ...get().notifications,
          ],
        });
      }
    }
  },
}));
