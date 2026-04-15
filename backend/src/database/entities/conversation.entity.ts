import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('conversations')
@Index(['participant1Id', 'participant2Id'], { unique: true })
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'participant1_id', type: 'int' })
  participant1Id: number;

  @Column({ name: 'participant2_id', type: 'int' })
  participant2Id: number;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'participant1_id' })
  participant1: User;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'participant2_id' })
  participant2: User;

  @Column({ name: 'last_message_at', type: 'timestamptz', nullable: true })
  lastMessageAt: Date | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  name: string | null;

  @Column({ name: 'created_by_id', type: 'int', nullable: true })
  createdById: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
