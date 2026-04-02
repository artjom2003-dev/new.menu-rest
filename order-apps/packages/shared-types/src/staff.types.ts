import { StaffRole } from './enums';

export interface Staff {
  id: number;
  restaurantId: number;
  name: string;
  role: StaffRole;
  isActive: boolean;
  assignedTables: number[];
  createdAt: string;
}

export interface StaffAuthRequest {
  restaurantId: number;
  pin?: string;
  login?: string;
  password?: string;
}

export interface StaffAuthResponse {
  token: string;
  staff: Staff;
}

export interface StaffTableAssignment {
  id: number;
  staffId: number;
  tableId: number;
  shiftDate: string;
}
