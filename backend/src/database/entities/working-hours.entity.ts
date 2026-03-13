import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Restaurant } from './restaurant.entity';

@Entity('working_hours')
@Unique(['restaurantId', 'dayOfWeek'])
export class WorkingHours {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Restaurant, (r) => r.workingHours, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @Column({ name: 'restaurant_id' })
  restaurantId: number;

  @Column({ name: 'day_of_week', type: 'smallint' })
  dayOfWeek: number; // 0=Пн, 6=Вс

  @Column({ name: 'open_time', type: 'time', nullable: true })
  openTime: string | null;

  @Column({ name: 'close_time', type: 'time', nullable: true })
  closeTime: string | null;

  @Column({ name: 'is_closed', default: false })
  isClosed: boolean;
}
