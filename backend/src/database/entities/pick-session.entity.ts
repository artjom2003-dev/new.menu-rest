import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { User } from './user.entity';

@Entity('pick_sessions')
export class PickSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'conversation_id', type: 'int' })
  conversationId: number;

  @ManyToOne(() => Conversation)
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column({ name: 'creator_id', type: 'int' })
  creatorId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'creator_id' })
  creator: User;

  @Column({ type: 'varchar', length: 10 })
  mode: 'swipe' | 'vote';

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: 'active' | 'completed' | 'cancelled';

  @Column({ type: 'jsonb', nullable: true })
  filters: Record<string, unknown> | null;

  @Column({ name: 'restaurant_pool', type: 'jsonb', default: '[]' })
  restaurantPool: number[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}
