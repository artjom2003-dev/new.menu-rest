import { Entity, PrimaryGeneratedColumn, Column, Index, OneToMany } from 'typeorm';
import { Restaurant } from './restaurant.entity';

@Entity('cities')
export class City {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  name: string;

  @Index({ unique: true })
  @Column({ length: 150 })
  slug: string;

  @Column({ length: 100, default: 'Россия' })
  country: string;

  @Column({ name: 'legacy_id', type: 'int', nullable: true, unique: true })
  legacyId: number | null;

  @OneToMany(() => Restaurant, (r) => r.city)
  restaurants: Restaurant[];
}
