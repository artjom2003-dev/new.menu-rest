import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_taste_profiles')
export class UserTasteProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'jsonb' })
  axes: Record<string, number>;

  @Column({ type: 'varchar', length: 50 })
  archetype: string;

  @Column({ type: 'text', array: true, default: '{}' })
  dietary: string[];

  @Column({ name: 'raw_answers', type: 'jsonb' })
  rawAnswers: Record<string, number[]>;

  @Column({ name: 'wine_prefs', type: 'jsonb', nullable: true })
  winePrefs: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
