import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index, Unique,
} from 'typeorm';
import { User } from './user.entity';

@Entity('companions')
@Unique(['userId', 'companionId'])
export class Companion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'companion_id', type: 'int' })
  companionId: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: 'pending' | 'accepted' | 'declined';

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'companion_id' })
  companion: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
