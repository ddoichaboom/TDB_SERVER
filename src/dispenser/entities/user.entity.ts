// user.entity.ts
import { Entity, Column, PrimaryColumn, OneToMany } from 'typeorm';
import { Machine } from './machine.entity';
import { Schedule } from './schedule.entity';
import { Medicine } from './medicine.entity';

@Entity('users')
export class User {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  user_id: string;

  @Column({ type: 'varchar', length: 50, nullable: true }) // ✅ nullable 추가
  connect: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  m_uid: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  k_uid: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'enum', enum: ['parent', 'child'] })
  role: 'parent' | 'child';

  @Column({ type: 'tinyint', default: 0 })
  took_today: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  birthDate: string;

  @Column({ type: 'int', nullable: true })
  age: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  refresh_token: string;

  // ✅ 관계 수정
  @OneToMany(() => Machine, (machine) => machine.family_owner)
  family_machines: Machine[]; // connect 기준: 우리 가족의 기기들

  @OneToMany(() => Machine, (machine) => machine.connected_user)
  connected_machines: Machine[]; // m_uid 기준: 내 m_uid와 연결된 기기들 (가족 모두 동일값)

  @OneToMany(() => Schedule, (schedule) => schedule.user)
  schedules: Schedule[];

  @OneToMany(() => Medicine, (medicine) => medicine.user)
  medicines: Medicine[];
}
