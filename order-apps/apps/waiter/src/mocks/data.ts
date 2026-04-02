import type { Table, Staff, Order, OrderItem } from '@menurest/shared-types';

export const MOCK_STAFF: Staff = {
  id: 1,
  restaurantId: 13269,
  name: 'Анна',
  role: 'waiter' as any,
  isActive: true,
  assignedTables: [1, 2, 3, 5, 7],
  createdAt: new Date().toISOString(),
};

export const MOCK_TABLES: Table[] = [
  { id: 1, restaurantId: 13269, number: 1, zone: 'hall' as any, capacity: 2, isActive: true, status: 'free' as any },
  { id: 2, restaurantId: 13269, number: 2, zone: 'hall' as any, capacity: 4, isActive: true, status: 'occupied' as any, currentOrderId: 101, guestCount: 3, occupiedSince: new Date(Date.now() - 25 * 60000).toISOString() },
  { id: 3, restaurantId: 13269, number: 3, zone: 'hall' as any, capacity: 4, isActive: true, status: 'free' as any },
  { id: 4, restaurantId: 13269, number: 4, zone: 'hall' as any, capacity: 6, isActive: true, status: 'occupied' as any, currentOrderId: 102, guestCount: 5, occupiedSince: new Date(Date.now() - 45 * 60000).toISOString() },
  { id: 5, restaurantId: 13269, number: 5, zone: 'terrace' as any, capacity: 2, isActive: true, status: 'check_requested' as any, currentOrderId: 103, guestCount: 2, occupiedSince: new Date(Date.now() - 60 * 60000).toISOString() },
  { id: 6, restaurantId: 13269, number: 6, zone: 'terrace' as any, capacity: 4, isActive: true, status: 'free' as any },
  { id: 7, restaurantId: 13269, number: 7, zone: 'vip' as any, capacity: 8, isActive: true, status: 'occupied' as any, currentOrderId: 104, guestCount: 6, occupiedSince: new Date(Date.now() - 15 * 60000).toISOString() },
  { id: 8, restaurantId: 13269, number: 8, zone: 'bar' as any, capacity: 2, isActive: true, status: 'free' as any },
];

const mkItem = (id: number, orderId: number, name: string, qty: number, price: number, status: string, station?: string): any => ({
  id, orderId, dishId: id * 10, dishName: name, quantity: qty, unitPrice: price, totalPrice: price * qty, status, station: station || 'hot', createdAt: new Date().toISOString(),
});

export const MOCK_ORDERS: Order[] = [
  {
    id: 101, restaurantId: 13269, tableId: 2, tableNumber: 2, source: 'waiter' as any, status: 'preparing' as any, waiterId: 1, waiterName: 'Анна',
    totalAmount: 4776,
    items: [
      mkItem(1, 101, 'Рибай стейк', 1, 2222, 'preparing', 'hot'),
      mkItem(2, 101, 'Нью-Йорк стейк', 1, 2555, 'pending', 'hot'),
    ],
    createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 60000).toISOString(),
  },
  {
    id: 102, restaurantId: 13269, tableId: 4, tableNumber: 4, source: 'qr' as any, status: 'preparing' as any,
    totalAmount: 3887,
    items: [
      mkItem(3, 102, 'CHUCK Бургер', 2, 999, 'ready', 'hot'),
      mkItem(4, 102, 'Крылышки Hot', 1, 888, 'preparing', 'hot'),
      mkItem(5, 102, 'Чизкейк', 1, 550, 'pending', 'pastry'),
      mkItem(6, 102, 'Mojito', 1, 690, 'served', 'bar'),
    ],
    createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    id: 103, restaurantId: 13269, tableId: 5, tableNumber: 5, source: 'qr' as any, status: 'served' as any,
    totalAmount: 3110,
    items: [
      mkItem(7, 103, 'Брискет', 1, 2222, 'served', 'hot'),
      mkItem(8, 103, 'Крылышки Hot', 1, 888, 'served', 'hot'),
    ],
    createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 20 * 60000).toISOString(),
  },
  {
    id: 104, restaurantId: 13269, tableId: 7, tableNumber: 7, source: 'waiter' as any, status: 'confirmed' as any, waiterId: 1, waiterName: 'Анна',
    totalAmount: 8220,
    items: [
      mkItem(9, 104, 'Смоки Баскет', 1, 3555, 'pending', 'hot'),
      mkItem(10, 104, 'Рибай стейк', 2, 2222, 'pending', 'hot'),
      mkItem(11, 104, 'Aperol Spritz', 3, 690, 'pending', 'bar'),
    ],
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 14 * 60000).toISOString(),
  },
];

export const MOCK_NOTIFICATIONS = [
  { id: 1, type: 'ready', message: 'Стол 4: CHUCK Бургер (×2) готов!', tableNumber: 4, time: new Date(Date.now() - 2 * 60000).toISOString() },
  { id: 2, type: 'check', message: 'Стол 5 просит счёт', tableNumber: 5, time: new Date(Date.now() - 5 * 60000).toISOString() },
  { id: 3, type: 'qr_order', message: 'Новый QR-заказ на стол 4', tableNumber: 4, time: new Date(Date.now() - 44 * 60000).toISOString() },
];
