import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, ManyToMany, JoinTable, Index,
} from 'typeorm';
import { City } from './city.entity';
import { Restaurant } from './restaurant.entity';

export type UserRole = 'user' | 'owner' | 'admin';
export type LoyaltyLevel = 'bronze' | 'silver' | 'gold';
export type AuthProvider = 'email' | 'vk' | 'telegram';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ length: 200 })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 200, nullable: true, select: false })
  passwordHash: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  name: string | null;

  @Column({ name: 'avatar_url', type: 'varchar', length: 500, nullable: true })
  avatarUrl: string | null;

  @ManyToOne(() => City, { nullable: true })
  @JoinColumn({ name: 'city_id' })
  city: City | null;

  @Column({ name: 'city_id', type: 'int', nullable: true })
  cityId: number | null;

  @Column({ name: 'loyalty_points', default: 0 })
  loyaltyPoints: number;

  @Column({ name: 'loyalty_level', length: 20, default: 'bronze' })
  loyaltyLevel: LoyaltyLevel;

  @Column({ length: 20, default: 'user' })
  role: UserRole;

  @Column({ name: 'auth_provider', length: 20, default: 'email' })
  authProvider: AuthProvider;

  @Column({ name: 'auth_provider_id', type: 'varchar', length: 200, nullable: true })
  authProviderId: string | null;

  @Column({ name: 'referral_code', type: 'varchar', length: 12, nullable: true, unique: true })
  referralCode: string | null;

  @Column({ name: 'referred_by', type: 'int', nullable: true })
  referredBy: number | null;

  @Column({ name: 'nutrition_goal', type: 'varchar', length: 30, nullable: true })
  nutritionGoal: string | null;

  @Column({ name: 'hide_from_wishlists', type: 'boolean', default: false })
  hideFromWishlists: boolean;

  @Column({ name: 'block_messages', type: 'boolean', default: false })
  blockMessages: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  bio: string | null;

  @Column({ type: 'int', nullable: true })
  age: number | null;

  @Column({ name: 'city_name', type: 'varchar', length: 100, nullable: true })
  cityName: string | null;

  @Column({ name: 'favorite_cuisines', type: 'varchar', length: 300, nullable: true })
  favoriteCuisines: string | null;

  @Column({ name: 'favorite_dishes', type: 'varchar', length: 300, nullable: true })
  favoriteDishes: string | null;

  @Column({ name: 'reset_code', type: 'varchar', length: 6, nullable: true, select: false })
  resetCode: string | null;

  @Column({ name: 'reset_code_expires_at', type: 'timestamptz', nullable: true, select: false })
  resetCodeExpiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToMany(() => Restaurant)
  @JoinTable({
    name: 'user_favorites',
    joinColumn: { name: 'user_id' },
    inverseJoinColumn: { name: 'restaurant_id' },
  })
  favoriteRestaurants: Restaurant[];

  @ManyToMany(() => Restaurant)
  @JoinTable({
    name: 'user_wishlists',
    joinColumn: { name: 'user_id' },
    inverseJoinColumn: { name: 'restaurant_id' },
  })
  wishlistRestaurants: Restaurant[];
}
