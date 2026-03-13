import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('features')
export class Feature {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Index({ unique: true })
  @Column({ length: 50 })
  slug: string;

  @Column({ length: 50 })
  category: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  icon: string | null;
}
