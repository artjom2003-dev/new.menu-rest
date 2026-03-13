import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Restaurant } from './restaurant.entity';

export type PhotoSource = 'internal' | '2gis' | 'user' | 'legacy';

@Entity('photos')
export class Photo {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Restaurant, (r) => r.photos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @Column({ name: 'restaurant_id' })
  restaurantId: number;

  @Column({ length: 500 })
  url: string;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_cover', default: false })
  isCover: boolean;

  @Column({ length: 50, default: 'internal' })
  source: PhotoSource;

  @Column({ name: 'legacy_id', type: 'int', nullable: true })
  legacyId: number | null;

  @Column({ name: 'alt_text', type: 'varchar', length: 500, nullable: true })
  altText: string | null;

  @Column({ name: 'thumbnail_url', type: 'varchar', length: 500, nullable: true })
  thumbnailUrl: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
