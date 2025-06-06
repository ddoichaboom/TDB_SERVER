// medicine.entity.ts
import {
  Entity,
  Column,
  PrimaryColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Machine } from './machine.entity';
import { Schedule } from './schedule.entity';

@Entity('medicine')
export class Medicine {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  medi_id: string;

  @PrimaryColumn({ type: 'varchar', length: 50 }) // ✅ 복합 PK 추가
  connect: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'tinyint', default: 0 })
  warning: boolean;

  @Column({ type: 'date', nullable: true })
  start_date: Date;

  @Column({ type: 'date', nullable: true })
  end_date: Date;

  @Column({ type: 'json', nullable: true }) // ✅ 누락된 컬럼 추가
  target_users: string[] | null;

  @OneToMany(() => Machine, (machine) => machine.medicine)
  machines: Machine[];

  @OneToMany(() => Schedule, (schedule) => schedule.medicine)
  schedules: Schedule[];

  @ManyToOne(() => User, (user) => user.medicines)
  @JoinColumn({ name: 'connect', referencedColumnName: 'connect' })
  user: User;
}
