import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  OneToMany, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { Restaurant } from './restaurant.entity';
import { User } from './user.entity';

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'paid' | 'cancelled';
export type OrderSource = 'qr' | 'waiter';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Restaurant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @Column({ name: 'restaurant_id' })
  restaurantId: number;

  @Column({ name: 'table_id' })
  tableId: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'user_id', nullable: true })
  userId: number | null;

  @Column({ name: 'waiter_id', type: 'int', nullable: true })
  waiterId: number | null;

  @Column({ name: 'session_id', type: 'varchar', length: 64, nullable: true })
  sessionId: string | null;

  @Column({ length: 20, default: 'qr' })
  source: OrderSource;

  @Index()
  @Column({ length: 20, default: 'pending' })
  status: OrderStatus;

  @Column({ name: 'total_amount', type: 'int', default: 0 })
  totalAmount: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @OneToMany('OrderItem', 'order', { cascade: true, eager: true })
  items: any[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
