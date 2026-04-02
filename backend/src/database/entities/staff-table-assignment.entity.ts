import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Staff } from './staff.entity';
import { Table } from './table.entity';

@Entity('staff_table_assignments')
@Index(['staffId', 'tableId', 'shiftDate'], { unique: true })
export class StaffTableAssignment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Staff, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staff_id' })
  staff: Staff;

  @Column({ name: 'staff_id' })
  staffId: number;

  @ManyToOne(() => Table, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'table_id' })
  table: Table;

  @Column({ name: 'table_id' })
  tableId: number;

  @Column({ name: 'shift_date', type: 'date' })
  shiftDate: string;
}
