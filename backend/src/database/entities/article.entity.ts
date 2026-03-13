import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index, ManyToMany, JoinTable, ManyToOne, JoinColumn,
} from 'typeorm';
import { Restaurant } from './restaurant.entity';
import { City } from './city.entity';

export type ArticleStatus = 'draft' | 'published' | 'archived';

@Entity('articles')
export class Article {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 300 })
  title: string;

  @Index({ unique: true })
  @Column({ length: 300 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  excerpt: string | null;

  @Column({ type: 'text' })
  body: string;

  @Column({ name: 'cover_url', type: 'varchar', length: 500, nullable: true })
  coverUrl: string | null;

  @Column({ length: 20, default: 'draft' })
  status: ArticleStatus;

  @Column({ name: 'seo_title', type: 'varchar', length: 300, nullable: true })
  seoTitle: string | null;

  @Column({ name: 'seo_description', type: 'varchar', length: 500, nullable: true })
  seoDescription: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category: string | null;

  @ManyToOne(() => City, { nullable: true })
  @JoinColumn({ name: 'city_id' })
  city: City;

  @Column({ name: 'city_id', type: 'int', nullable: true })
  cityId: number | null;

  @Column({ name: 'author_name', type: 'varchar', length: 200, nullable: true })
  authorName: string | null;

  @Column({ name: 'views_count', type: 'int', default: 0 })
  viewsCount: number;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToMany(() => Restaurant)
  @JoinTable({
    name: 'article_restaurants',
    joinColumn: { name: 'article_id' },
    inverseJoinColumn: { name: 'restaurant_id' },
  })
  restaurants: Restaurant[];
}
