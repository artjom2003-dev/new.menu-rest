import {
  Entity, PrimaryGeneratedColumn, Column,
  UpdateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Dish } from './dish.entity';
import { Restaurant } from './restaurant.entity';

@Entity('dish_taste_vectors')
export class DishTasteVector {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'dish_id', type: 'int' })
  dishId: number;

  @ManyToOne(() => Dish, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dish_id' })
  dish: Dish;

  @Index()
  @Column({ name: 'restaurant_id', type: 'int' })
  restaurantId: number;

  @ManyToOne(() => Restaurant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @Column({ type: 'jsonb' })
  axes: Record<string, number>;

  @Column({ name: 'pairing_wines', type: 'jsonb', nullable: true })
  pairingWines: Record<string, any> | null;

  @Column({ name: 'pairing_reason', type: 'text', nullable: true })
  pairingReason: string | null;

  @Column({ type: 'varchar', length: 30, default: 'computed' })
  source: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
