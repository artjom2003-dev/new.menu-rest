import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { RestaurantDish } from './restaurant-dish.entity';
import { Allergen } from './allergen.entity';

@Entity('dishes')
export class Dish {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 300 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  composition: string | null;

  @Column({ type: 'int', nullable: true })
  calories: number | null;

  @Column({ type: 'decimal', precision: 6, scale: 1, nullable: true })
  protein: number | null;

  @Column({ type: 'decimal', precision: 6, scale: 1, nullable: true })
  fat: number | null;

  @Column({ type: 'decimal', precision: 6, scale: 1, nullable: true })
  carbs: number | null;

  @Column({ name: 'weight_grams', type: 'int', nullable: true })
  weightGrams: number | null;

  @Column({ name: 'volume_ml', type: 'int', nullable: true })
  volumeMl: number | null;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'is_healthy_choice', default: false })
  isHealthyChoice: boolean;

  @Column({ name: 'legacy_id', type: 'int', nullable: true, unique: true })
  legacyId: number | null;

  @OneToMany(() => RestaurantDish, (rd) => rd.dish)
  restaurantDishes: RestaurantDish[];

  @ManyToMany(() => Allergen)
  @JoinTable({
    name: 'dish_allergens',
    joinColumn: { name: 'dish_id' },
    inverseJoinColumn: { name: 'allergen_id' },
  })
  allergens: Allergen[];
}
