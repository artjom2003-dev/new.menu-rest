import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index, Unique,
} from 'typeorm';
import { PickSession } from './pick-session.entity';
import { User } from './user.entity';

@Entity('pick_votes')
@Unique(['sessionId', 'userId', 'restaurantId'])
export class PickVote {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'session_id', type: 'int' })
  sessionId: number;

  @ManyToOne(() => PickSession)
  @JoinColumn({ name: 'session_id' })
  session: PickSession;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'restaurant_id', type: 'int' })
  restaurantId: number;

  @Column({ type: 'varchar', length: 15 })
  reaction: 'like' | 'dislike' | 'superlike';

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
