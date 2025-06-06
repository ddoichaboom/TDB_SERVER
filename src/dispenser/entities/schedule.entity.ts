// schedule.entity.ts
import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Medicine } from './medicine.entity';

@Entity('schedule')
export class Schedule {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  schedule_id: string;

  @Column({ type: 'varchar', length: 50 })
  connect: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  user_id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  medi_id: string;

  @Column({
    type: 'enum',
    enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
  })
  day_of_week: string;

  @Column({
    type: 'enum',
    enum: ['morning', 'afternoon', 'evening'],
    nullable: true,
  })
  time_of_day: string;

  @Column({ type: 'int' })
  dose: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @ManyToOne(() => User, (user) => user.schedules)
  @JoinColumn({ name: 'user_id', referencedColumnName: 'user_id' })
  user: User;

  // ✅ Medicine과의 관계 수정 - 복합키 조인
  @ManyToOne(() => Medicine, (medicine) => medicine.schedules)
  @JoinColumn([
    { name: 'medi_id', referencedColumnName: 'medi_id' },
    { name: 'connect', referencedColumnName: 'connect' },
  ])
  medicine: Medicine;
}

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening';
