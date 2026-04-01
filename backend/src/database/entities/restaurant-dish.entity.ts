import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { Restaurant } from './restaurant.entity';
import { Dish } from './dish.entity';
import { MenuCategory } from './menu-category.entity';

@Entity('restaurant_dishes')
@Unique(['restaurantId', 'dishId'])
export class RestaurantDish {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Restaurant, (r) => r.restaurantDishes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @Column({ name: 'restaurant_id' })
  restaurantId: number;

  @ManyToOne(() => Dish, (d) => d.restaurantDishes, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'dish_id' })
  dish: Dish;

  @Column({ name: 'dish_id' })
  dishId: number;

  @Column({ name: 'category_name', type: 'varchar', length: 200, nullable: true })
  categoryName: string | null;

  @Column({ type: 'int' })
  price: number; // в копейках

  @Column({ name: 'is_available', default: true })
  isAvailable: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @ManyToOne(() => MenuCategory, { nullable: true })
  @JoinColumn({ name: 'menu_category_id' })
  menuCategory: MenuCategory;

  @Column({ name: 'menu_category_id', type: 'int', nullable: true })
  menuCategoryId: number | null;

  @Column({ name: 'prep_time_min', type: 'int', nullable: true })
  prepTimeMin: number | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  station: string | null;
}
