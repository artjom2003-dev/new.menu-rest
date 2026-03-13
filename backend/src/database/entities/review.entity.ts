import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Restaurant } from './restaurant.entity';
import { User } from './user.entity';

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'user_id', type: 'int', nullable: true })
  userId: number | null;

  @ManyToOne(() => Restaurant, (r) => r.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @Column({ name: 'restaurant_id' })
  restaurantId: number;

  // 4 рейтинга по ТЗ
  @Column({ name: 'rating_food', type: 'smallint', nullable: true })
  ratingFood: number | null;

  @Column({ name: 'rating_service', type: 'smallint', nullable: true })
  ratingService: number | null;

  @Column({ name: 'rating_atmosphere', type: 'smallint', nullable: true })
  ratingAtmosphere: number | null;

  @Column({ name: 'rating_value', type: 'smallint', nullable: true })
  ratingValue: number | null;

  // Агрегированный (среднее из 4)
  @Column({ name: 'rating_overall', type: 'decimal', precision: 3, scale: 2 })
  ratingOverall: number;

  @Column({ type: 'text', nullable: true })
  text: string | null;

  @Column({ name: 'author_name', type: 'varchar', length: 100, nullable: true })
  authorName: string | null;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ length: 20, default: 'pending' })
  status: ReviewStatus;

  @Column({ name: 'reply_text', type: 'text', nullable: true })
  replyText: string | null;

  @Column({ name: 'legacy_id', type: 'int', nullable: true, unique: true })
  legacyId: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
