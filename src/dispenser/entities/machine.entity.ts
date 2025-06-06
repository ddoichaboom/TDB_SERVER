// machine.entity.ts
import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { User } from './user.entity';
import { Medicine } from './medicine.entity';

@Entity('machine')
export class Machine {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  machine_id: string;

  @PrimaryColumn({ type: 'varchar', length: 50 }) // ✅ 복합 PK 유지
  medi_id: string;

  @Column({ type: 'varchar', length: 50 })
  owner: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  error_status: string;

  @Column({ type: 'datetime' })
  last_error_at: Date;

  @Column({ type: 'int' })
  total: number;

  @Column({ type: 'int' })
  remain: number;

  @Column({ type: 'tinyint', nullable: true })
  slot: number;

  @Column({ type: 'tinyint', nullable: false, default: 3 }) // ✅ 누락된 컬럼 추가
  max_slot: number;

  // ✅ Medicine과의 관계 (슬롯에 들어간 약)
  @ManyToOne(() => Medicine, (medicine) => medicine.machines)
  @JoinColumn([
    { name: 'medi_id', referencedColumnName: 'medi_id' },
    { name: 'owner', referencedColumnName: 'connect' },
  ])
  medicine: Medicine;

  // ✅ 가족 그룹과의 관계 (owner = connect)
  @ManyToOne(() => User, (user) => user.family_machines)
  @JoinColumn({ name: 'owner', referencedColumnName: 'connect' })
  family_owner: User;

  // ✅ 연결된 사용자와의 관계 (machine_id = m_uid, 가족 모두 동일값 가짐)
  @ManyToOne(() => User, (user) => user.connected_machines)
  @JoinColumn({ name: 'machine_id', referencedColumnName: 'm_uid' })
  connected_user: User;
}
