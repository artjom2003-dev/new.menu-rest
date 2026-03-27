import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, ManyToMany, JoinColumn, JoinTable,
  OneToMany, Index,
} from 'typeorm';
import { City } from './city.entity';
import { User } from './user.entity';
import { RestaurantChain } from './restaurant-chain.entity';
import { Cuisine } from './cuisine.entity';
import { Feature } from './feature.entity';
import { WorkingHours } from './working-hours.entity';
import { Photo } from './photo.entity';
import { Review } from './review.entity';
import { RestaurantDish } from './restaurant-dish.entity';
import { RestaurantLocation } from './restaurant-location.entity';

export type RestaurantStatus = 'draft' | 'published' | 'archived' | 'closed';

@Entity('restaurants')
export class Restaurant {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => RestaurantChain, (c) => c.restaurants, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'chain_id' })
  chain: RestaurantChain | null;

  @Column({ name: 'chain_id', type: 'int', nullable: true })
  chainId: number | null;

  @Column({ length: 200 })
  name: string;

  @Index({ unique: true })
  @Column({ length: 200 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ManyToOne(() => City, (c) => c.restaurants)
  @JoinColumn({ name: 'city_id' })
  city: City;

  @Column({ name: 'city_id' })
  cityId: number;

  @Column({ type: 'varchar', length: 300, nullable: true })
  address: string | null;

  @Column({ name: 'metro_station', type: 'varchar', length: 100, nullable: true })
  metroStation: string | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  lat: number | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  lng: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  website: string | null;

  @Column({ name: 'price_level', type: 'smallint', nullable: true })
  priceLevel: number | null;

  @Column({ name: 'average_bill', type: 'int', nullable: true })
  averageBill: number | null;

  @Column({ name: 'has_wifi', default: false })
  hasWifi: boolean;

  @Column({ name: 'has_delivery', default: false })
  hasDelivery: boolean;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column({ name: 'review_count', default: 0 })
  reviewCount: number;

  @Index()
  @Column({ length: 20, default: 'draft' })
  status: RestaurantStatus;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  instagram: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  vk: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  facebook: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  youtube: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Index()
  @Column({ name: 'venue_type', type: 'varchar', length: 50, nullable: true })
  venueType: string | null;

  @Column({ name: 'legacy_id', type: 'int', nullable: true, unique: true })
  legacyId: number | null;

  @Column({ name: 'external_2gis_id', type: 'varchar', length: 255, nullable: true })
  external2gisId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'owner_id' })
  owner: User | null;

  @Column({ name: 'owner_id', type: 'int', nullable: true })
  ownerId: number | null;

  // Relations
  @ManyToMany(() => Cuisine)
  @JoinTable({
    name: 'restaurant_cuisines',
    joinColumn: { name: 'restaurant_id' },
    inverseJoinColumn: { name: 'cuisine_id' },
  })
  cuisines: Cuisine[];

  @ManyToMany(() => Feature)
  @JoinTable({
    name: 'restaurant_features',
    joinColumn: { name: 'restaurant_id' },
    inverseJoinColumn: { name: 'feature_id' },
  })
  features: Feature[];

  @OneToMany(() => WorkingHours, (wh) => wh.restaurant, { cascade: true })
  workingHours: WorkingHours[];

  @OneToMany(() => Photo, (p) => p.restaurant, { cascade: true })
  photos: Photo[];

  @OneToMany(() => Review, (r) => r.restaurant)
  reviews: Review[];

  @OneToMany(() => RestaurantDish, (rd) => rd.restaurant)
  restaurantDishes: RestaurantDish[];

  @OneToMany(() => RestaurantLocation, (loc) => loc.restaurant)
  locations: RestaurantLocation[];

  @Column({ type: 'jsonb', nullable: true })
  translations: Record<string, any> | null;
}
