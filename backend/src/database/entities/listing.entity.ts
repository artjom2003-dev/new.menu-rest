import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Restaurant } from './restaurant.entity';

export type ListingType = 'job' | 'supplier';
export type ListingStatus = 'active' | 'closed';

@Entity('listings')
export class Listing {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Restaurant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @Column({ name: 'restaurant_id', type: 'int' })
  restaurantId: number;

  @Column({ type: 'varchar', length: 20 })
  type: ListingType;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  salary: string | null;

  @Column({ name: 'contact_info', type: 'varchar', length: 300, nullable: true })
  contactInfo: string | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: ListingStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
