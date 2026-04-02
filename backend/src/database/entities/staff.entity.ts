import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, Index,
} from 'typeorm';
import { Restaurant } from './restaurant.entity';

export type StaffRole = 'waiter' | 'senior_waiter' | 'hall_admin';

@Entity('staff')
export class Staff {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Restaurant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @Column({ name: 'restaurant_id' })
  restaurantId: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Index()
  @Column({ name: 'pin_hash', type: 'varchar', length: 255 })
  pinHash: string;

  @Column({ type: 'varchar', length: 30, default: 'waiter' })
  role: StaffRole;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
