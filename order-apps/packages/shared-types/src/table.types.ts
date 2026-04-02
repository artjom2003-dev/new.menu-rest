import { TableStatus, TableZone } from './enums';

export interface Table {
  id: number;
  restaurantId: number;
  number: number;
  zone: TableZone;
  capacity: number;
  isActive: boolean;
  status: TableStatus;
  qrCodeUrl?: string;
  currentOrderId?: number;
  currentOrderTotal?: number;
  guestCount?: number;
  occupiedSince?: string;
}

export interface CreateTableRequest {
  number: number;
  zone: TableZone;
  capacity: number;
}

export interface TransferTableRequest {
  targetTableId: number;
}

export interface MergeTablesRequest {
  sourceTableIds: number[];
  targetTableId: number;
}
