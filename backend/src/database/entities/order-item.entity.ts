import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Order } from './order.entity';

export type OrderItemStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Order, (o) => o.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'order_id' })
  orderId: number;

  @Column({ name: 'dish_id' })
  dishId: number;

  @Column({ name: 'dish_name', type: 'varchar', length: 255 })
  dishName: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'int' })
  unitPrice: number;

  @Column({ length: 20, default: 'pending' })
  status: OrderItemStatus;

  @Column({ type: 'varchar', length: 30, nullable: true })
  station: string | null;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ name: 'cancelled_reason', type: 'text', nullable: true })
  cancelledReason: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
