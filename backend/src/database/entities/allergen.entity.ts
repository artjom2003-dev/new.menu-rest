import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('allergens')
export class Allergen {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Index({ unique: true })
  @Column({ length: 50 })
  slug: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  icon: string | null;

  @Column({ name: 'eu_code', type: 'varchar', length: 5, nullable: true })
  euCode: string | null;
}
