import { Order, OrderItem } from './order.types';
import { TableStatus } from './enums';

export interface OrderCreatedEvent {
  order: Order;
}

export interface OrderStatusChangedEvent {
  orderId: number;
  status: string;
  itemId?: number;
  itemStatus?: string;
}

export interface OrderItemAddedEvent {
  orderId: number;
  items: OrderItem[];
}

export interface OrderItemCancelledEvent {
  orderId: number;
  itemId: number;
  reason: string;
}

export interface TableCallWaiterEvent {
  tableId: number;
  tableNumber: number;
  restaurantId: number;
}

export interface TableRequestCheckEvent {
  tableId: number;
  tableNumber: number;
  orderId: number;
}

export interface DishStopListEvent {
  dishId: number;
  isAvailable: boolean;
  restaurantId: number;
}

export interface TableStatusChangedEvent {
  tableId: number;
  status: TableStatus;
}
