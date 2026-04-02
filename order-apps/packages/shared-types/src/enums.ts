export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY = 'ready',
  SERVED = 'served',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

export enum OrderItemStatus {
  PENDING = 'pending',
  PREPARING = 'preparing',
  READY = 'ready',
  SERVED = 'served',
  CANCELLED = 'cancelled',
}

export enum OrderSource {
  QR = 'qr',
  WAITER = 'waiter',
}

export enum TableStatus {
  FREE = 'free',
  OCCUPIED = 'occupied',
  CHECK_REQUESTED = 'check_requested',
}

export enum TableZone {
  HALL = 'hall',
  TERRACE = 'terrace',
  VIP = 'vip',
  BAR = 'bar',
}

export enum StaffRole {
  WAITER = 'waiter',
  SENIOR_WAITER = 'senior_waiter',
  HALL_ADMIN = 'hall_admin',
}

export enum DishStation {
  HOT = 'hot',
  COLD = 'cold',
  BAR = 'bar',
  PASTRY = 'pastry',
}
