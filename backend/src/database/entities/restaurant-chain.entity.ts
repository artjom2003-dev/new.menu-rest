import { Entity, PrimaryGeneratedColumn, Column, Index, OneToMany } from 'typeorm';
import { Restaurant } from './restaurant.entity';

@Entity('restaurant_chains')
export class RestaurantChain {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  name: string;

  @Index({ unique: true })
  @Column({ length: 200 })
  slug: string;

  @Column({ name: 'legacy_id', type: 'int', nullable: true, unique: true })
  legacyId: number | null;

  @OneToMany(() => Restaurant, (r) => r.chain)
  restaurants: Restaurant[];
}
