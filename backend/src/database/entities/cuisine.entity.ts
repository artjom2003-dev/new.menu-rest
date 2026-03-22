import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('cuisines')
export class Cuisine {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Index({ unique: true })
  @Column({ length: 100 })
  slug: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  icon: string | null;

  @Column({ type: 'varchar', length: 20, default: 'cuisine' })
  type: string; // 'cuisine' = национальная кухня, 'specialty' = блюда/специализация

  @Column({ name: 'legacy_id', type: 'int', nullable: true, unique: true })
  legacyId: number | null;
}
