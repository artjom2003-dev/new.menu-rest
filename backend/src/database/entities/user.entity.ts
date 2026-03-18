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

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToMany(() => Restaurant)
  @JoinTable({
    name: 'user_favorites',
    joinColumn: { name: 'user_id' },
    inverseJoinColumn: { name: 'restaurant_id' },
  })
  favoriteRestaurants: Restaurant[];
}
