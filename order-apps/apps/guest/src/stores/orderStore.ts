import { create } from 'zustand';
import type { Order } from '@menurest/shared-types';

interface OrderState {
  activeOrder: Order | null;
  loading: boolean;
  error: string | null;

  submitOrder: (data: {
    restaurantId: number;
    tableId: number;
    items: { dishId: number; quantity: number; comment?: string }[];
    comment?: string;
  }) => Promise<Order>;

  loadOrder: (orderId: number) => Promise<void>;
  setOrder: (order: Order) => void;
  clearOrder: () => void;
}

export const useOrderStore = create<OrderState>((set) => ({
  activeOrder: null,
  loading: false,
  error: null,

  submitOrder: async (data) => {
    set({ loading: true, error: null });
    // TODO: replace with real API call
    await new Promise((r) => setTimeout(r, 800));
    const mockOrder: Order = {
      id: Math.floor(Math.random() * 10000),
      restaurantId: data.restaurantId,
      tableId: data.tableId,
      tableNumber: 5,
      source: 'qr' as any,
      status: 'pending' as any,
      items: data.items.map((item, i) => ({
        id: i + 1,
        orderId: 0,
        dishId: item.dishId,
        dishName: `Блюдо #${item.dishId}`,
        quantity: item.quantity,
        unitPrice: 0,
        totalPrice: 0,
        status: 'pending' as any,
        comment: item.comment,
        createdAt: new Date().toISOString(),
      })),
      totalAmount: 0,
      comment: data.comment,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set({ activeOrder: mockOrder, loading: false });
    return mockOrder;
  },

  loadOrder: async (_orderId: number) => {
    set({ loading: true });
    await new Promise((r) => setTimeout(r, 300));
    set({ loading: false });
  },

  setOrder: (order) => set({ activeOrder: order }),
  clearOrder: () => set({ activeOrder: null }),
}));
