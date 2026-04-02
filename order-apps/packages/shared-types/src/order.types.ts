import { OrderStatus, OrderItemStatus, OrderSource, DishStation } from './enums';

export interface OrderItem {
  id: number;
  orderId: number;
  dishId: number;
  dishName: string;
  dishPhoto?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: OrderItemStatus;
  station?: DishStation;
  comment?: string;
  cancelledReason?: string;
  createdAt: string;
}

export interface Order {
  id: number;
  restaurantId: number;
  tableId: number;
  tableNumber: number;
  userId?: number;
  waiterId?: number;
  waiterName?: string;
  source: OrderSource;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderRequest {
  restaurantId: number;
  tableId: number;
  source: OrderSource;
  waiterId?: number;
  items: { dishId: number; quantity: number; comment?: string }[];
  comment?: string;
  sessionId?: string;
}

export interface AddOrderItemsRequest {
  items: { dishId: number; quantity: number; comment?: string }[];
}

export interface CancelOrderItemRequest {
  reason: string;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
}

export interface PreCheckResponse {
  orderId: number;
  items: { name: string; quantity: number; unitPrice: number; totalPrice: number }[];
  totalAmount: number;
}
