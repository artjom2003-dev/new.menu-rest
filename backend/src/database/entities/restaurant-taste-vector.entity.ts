import {
  Entity, PrimaryGeneratedColumn, Column,
  UpdateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Restaurant } from './restaurant.entity';

@Entity('restaurant_taste_vectors')
export class RestaurantTasteVector {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ name: 'restaurant_id', type: 'int' })
  restaurantId: number;

  @ManyToOne(() => Restaurant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @Column({ type: 'jsonb' })
  axes: Record<string, number>;

  @Column({ type: 'float', default: 0 })
  confidence: number;

  @Column({ type: 'varchar', length: 30, default: 'computed' })
  source: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
