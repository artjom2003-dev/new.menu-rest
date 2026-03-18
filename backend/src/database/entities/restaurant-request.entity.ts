import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type RestaurantRequestStatus = 'pending' | 'approved' | 'rejected';

@Entity('restaurant_requests')
export class RestaurantRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'restaurant_name', type: 'varchar', length: 200 })
  restaurantName: string;

  @Column({ type: 'varchar', length: 100 })
  city: string;

  @Column({ type: 'varchar', length: 300 })
  address: string;

  @Column({ name: 'contact_name', type: 'varchar', length: 100 })
  contactName: string;

  @Column({ name: 'contact_phone', type: 'varchar', length: 30 })
  contactPhone: string;

  @Column({ name: 'contact_email', type: 'varchar', length: 200 })
  contactEmail: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  website: string | null;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: RestaurantRequestStatus;

  @Column({ name: 'admin_note', type: 'text', nullable: true })
  adminNote: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
