import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Restaurant } from './restaurant.entity';

export type TableStatus = 'free' | 'occupied' | 'check_requested';
export type TableZone = 'hall' | 'terrace' | 'vip' | 'bar';

@Entity('tables')
@Index(['restaurantId', 'number'], { unique: true })
export class Table {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Restaurant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @Column({ name: 'restaurant_id' })
  restaurantId: number;

  @Column({ type: 'int' })
  number: number;

  @Column({ type: 'varchar', length: 20, default: 'hall' })
  zone: TableZone;

  @Column({ type: 'int', default: 4 })
  capacity: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 20, default: 'free' })
  status: TableStatus;

  @Column({ name: 'qr_code_url', type: 'varchar', length: 500, nullable: true })
  qrCodeUrl: string | null;

  @Column({ name: 'current_order_id', type: 'int', nullable: true })
  currentOrderId: number | null;

  @Column({ name: 'guest_count', type: 'int', nullable: true })
  guestCount: number | null;

  @Column({ name: 'occupied_since', type: 'timestamptz', nullable: true })
  occupiedSince: Date | null;
}
