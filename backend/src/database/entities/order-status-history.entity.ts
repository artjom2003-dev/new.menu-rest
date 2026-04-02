import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Order } from './order.entity';

@Entity('order_status_history')
export class OrderStatusHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'order_id' })
  orderId: number;

  @Column({ type: 'varchar', length: 20 })
  status: string;

  @Column({ name: 'changed_by', type: 'int', nullable: true })
  changedBy: number | null;

  @Column({ name: 'changed_by_role', type: 'varchar', length: 20, nullable: true })
  changedByRole: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
