// dispenser.service.ts
import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from './entities/user.entity';
import { Cron } from '@nestjs/schedule';
import { Schedule, DayOfWeek, TimeOfDay } from './entities/schedule.entity';
import { Medicine } from './entities/medicine.entity';
import { Machine } from './entities/machine.entity';

@Injectable()
export class DispenserService {
  private readonly logger = new Logger(DispenserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Schedule)
    private readonly scheduleRepo: Repository<Schedule>,
    @InjectRepository(Medicine)
    private readonly medicineRepo: Repository<Medicine>,
    @InjectRepository(Machine)
    private readonly machineRepo: Repository<Machine>,
  ) {}

  /**
   * 에러 안전 처리 헬퍼 함수
   */
  private handleError(error: unknown, context: string): never {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    this.logger.error(`${context}: ${errorMessage}`, errorStack);
    throw new InternalServerErrorException(`${context} 실패`);
  }

  /**
   * 매일 자정 took_today 초기화 크론잡
   */
  @Cron('0 0 * * *', { name: 'dailyReset' })
  async resetTookToday() {
    this.logger.log('⏰ [CRON] 매일 자정: took_today 초기화 시작');

    try {
      const result = await this.userRepo
        .createQueryBuilder()
        .update()
        .set({ took_today: 0 })
        .execute();

      this.logger.log(`✅ [CRON] 초기화 완료 - ${result.affected}명`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`❌ [CRON] 초기화 실패: ${errorMessage}`, errorStack);
    }
  }

  /**
   * 현재 시간대 계산
   */
  private getCurrentTimeOfDay(): TimeOfDay {
    const hour = new Date().getHours();
    return hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  }

  /**
   * 현재 요일 계산
   */
  private getCurrentDayOfWeek(): DayOfWeek {
    return new Date()
      .toLocaleDateString('en-US', { weekday: 'short' })
      .toLowerCase() as DayOfWeek;
  }

  /**
   * RFID UID로 사용자 인증
   */
  async authenticateByUid(uid: string) {
    this.logger.log(`UID 인증 시도: ${uid}`);

    try {
      const user = await this.userRepo.findOne({ where: { k_uid: uid } });

      if (!user) {
        this.logger.warn(`미등록 UID: ${uid}`);
        return {
          status: 'unregistered',
          qr_data: {
            type: 'register',
            k_uid: uid,
            createdAt: new Date().toISOString(),
          },
        };
      }

      this.logger.log(`✅ 인증 성공: ${user.name} (${user.role})`);
      return {
        status: 'ok',
        user: {
          user_id: user.user_id,
          name: user.name,
          role: user.role,
          connect: user.connect,
        },
      };
    } catch (error: unknown) {
      this.handleError(error, 'UID 인증');
    }
  }

  /**
   * 복용 완료 처리
   */
  async confirmIntake(uid: string) {
    try {
      const user = await this.userRepo.findOne({ where: { k_uid: uid } });
      if (!user) {
        throw new NotFoundException('등록되지 않은 사용자입니다.');
      }

      if (user.took_today === 1) {
        return {
          status: 'already_confirmed',
          message: '이미 오늘 복용이 확인되었습니다.',
        };
      }

      user.took_today = 1;
      await this.userRepo.save(user);

      this.logger.log(`✅ 복용 확인: ${user.name}`);
      return {
        status: 'confirmed',
        user_id: user.user_id,
        message: '복용이 확인되었습니다.',
      };
    } catch (error: unknown) {
      this.handleError(error, '복용 처리');
    }
  }

  /**
   * 가족 기준 현재 시간대 스케줄 조회
   */
  async getTodayScheduleByConnect(connect: string) {
    const dayOfWeek = this.getCurrentDayOfWeek();
    const timeOfDay = this.getCurrentTimeOfDay();

    try {
      const schedules = await this.scheduleRepo.find({
        where: { connect, day_of_week: dayOfWeek, time_of_day: timeOfDay },
        relations: ['medicine', 'user'],
      });

      return schedules.map((item) => ({
        schedule_id: item.schedule_id,
        medi_id: item.medi_id,
        medicine_name: item.medicine?.name || '',
        dose: item.dose,
        time_of_day: item.time_of_day,
        user_id: item.user_id,
        user_name: item.user?.name || '',
      }));
    } catch (error: unknown) {
      this.handleError(error, '스케줄 조회');
    }
  }

  /**
   * 특정 사용자 기준 현재 시간대 스케줄 조회
   */
  async getTodayScheduleByUser(user_id: string) {
    const dayOfWeek = this.getCurrentDayOfWeek();
    const timeOfDay = this.getCurrentTimeOfDay();

    try {
      const schedules = await this.scheduleRepo.find({
        where: { user_id, day_of_week: dayOfWeek, time_of_day: timeOfDay },
        relations: ['medicine', 'user'],
      });

      return schedules.map((item) => ({
        schedule_id: item.schedule_id,
        medi_id: item.medi_id,
        medicine_name: item.medicine?.name || '',
        dose: item.dose,
        time_of_day: item.time_of_day,
        user_id: item.user_id,
        user_name: item.user?.name || '',
      }));
    } catch (error: unknown) {
      this.handleError(error, '사용자 스케줄 조회');
    }
  }

  /**
   * 가족 기준 기기 약 목록 조회
   */
  async getMedicineListByConnect(connect: string) {
    try {
      const machines = await this.machineRepo.find({
        where: { owner: connect },
        relations: ['medicine'],
        order: { slot: 'ASC' },
      });

      return machines.map((m) => ({
        medi_id: m.medi_id,
        name: m.medicine?.name || '',
        remain: m.remain,
        total: m.total,
        slot: m.slot,
        warning: m.medicine?.warning || false,
        machine_id: m.machine_id,
      }));
    } catch (error: unknown) {
      this.handleError(error, '약 목록 조회');
    }
  }

  /**
   * RFID UID로 배출할 약 목록 조회 (현재 시간 이후 시간대 포함)
   */
  async getDispenseListByKitUid(k_uid: string) {
    try {
      const user = await this.userRepo.findOne({ where: { k_uid } });
      if (!user) {
        throw new NotFoundException('등록되지 않은 사용자입니다.');
      }

      const dayOfWeek = this.getCurrentDayOfWeek();
      const hour = new Date().getHours();

      // 현재 시간 이후의 시간대만 포함
      const timeSlots: TimeOfDay[] =
        hour < 12
          ? ['morning', 'afternoon', 'evening']
          : hour < 18
            ? ['afternoon', 'evening']
            : ['evening'];

      const schedules = await this.scheduleRepo.find({
        where: {
          user_id: user.user_id,
          day_of_week: dayOfWeek,
          time_of_day: In(timeSlots),
        },
        relations: ['medicine'],
      });

      // target_users 검증 추가
      const validSchedules = schedules.filter((s) => {
        if (!s.medicine?.target_users) return true; // 전체 대상
        return s.medicine.target_users.includes(user.user_id);
      });

      return validSchedules.map((s) => ({
        medi_id: s.medi_id,
        medicine_name: s.medicine?.name || '',
        dose: s.dose,
        time_of_day: s.time_of_day,
      }));
    } catch (error: unknown) {
      this.handleError(error, '배출 목록 조회');
    }
  }

  /**
   * 약 배출 결과 처리 (잔량 차감 및 warning 설정)
   */
  async handleDispenseResult(
    k_uid: string,
    dispenseList: { medi_id: string; dose: number }[],
  ) {
    try {
      const user = await this.userRepo.findOne({ where: { k_uid } });
      if (!user) {
        throw new NotFoundException('등록되지 않은 사용자입니다.');
      }

      const insufficient: string[] = [];
      const processed: string[] = [];

      for (const item of dispenseList) {
        // 복합키로 machine 조회
        const machine = await this.machineRepo.findOne({
          where: {
            medi_id: item.medi_id,
            owner: user.connect,
          },
          relations: ['medicine'],
        });

        if (!machine) {
          this.logger.warn(`❌ 존재하지 않는 약: ${item.medi_id}`);
          continue;
        }

        if (machine.remain < item.dose) {
          this.logger.warn(
            `⚠ 잔량 부족 - ${machine.medicine?.name || ''} (${machine.remain} < ${item.dose})`,
          );
          insufficient.push(machine.medicine?.name || item.medi_id);
          continue;
        }

        // 잔량 차감
        machine.remain -= item.dose;

        // 잔량이 5개 이하면 warning 설정
        if (machine.remain <= 5) {
          await this.medicineRepo.update(
            { medi_id: machine.medi_id, connect: user.connect },
            { warning: true },
          );
          this.logger.warn(`⚠ 잔량 경고 설정: ${machine.medicine?.name}`);
        }

        await this.machineRepo.save(machine);
        processed.push(machine.medicine?.name || item.medi_id);

        this.logger.log(
          `✅ ${machine.medicine?.name || ''} 배출 완료 (${item.dose}개 차감, 잔량: ${machine.remain})`,
        );
      }

      return {
        status: 'completed',
        processed,
        insufficient,
        message: `${processed.length}개 약 배출 완료${insufficient.length > 0 ? `, ${insufficient.length}개 부족` : ''}`,
      };
    } catch (error: unknown) {
      this.handleError(error, '배출 처리');
    }
  }

  /**
   * 기기 UID로 기기 상태 조회
   */
  async getMachineStatusByMuid(muid: string) {
    try {
      const user = await this.userRepo.findOne({ where: { m_uid: muid } });
      if (!user) {
        throw new NotFoundException('기기에 연결된 사용자가 없습니다.');
      }

      const machines = await this.machineRepo.find({
        where: { owner: user.connect },
        relations: ['medicine'],
        order: { slot: 'ASC' },
      });

      return {
        machine_id: muid,
        connect: user.connect,
        slots: machines.map((m) => ({
          slot: m.slot,
          remain: m.remain,
          total: m.total,
          medi_id: m.medi_id,
          name: m.medicine?.name || '',
          warning: m.medicine?.warning || false,
          usage_rate:
            m.total > 0
              ? Math.round(((m.total - m.remain) / m.total) * 100)
              : 0,
        })),
      };
    } catch (error: unknown) {
      this.handleError(error, '기기 상태 조회');
    }
  }

  /**
   * 기기 UID로 연결된 사용자들 조회
   */
  async getUsersByMuid(muid: string) {
    try {
      const user = await this.userRepo.findOne({ where: { m_uid: muid } });
      if (!user) {
        throw new NotFoundException('기기에 연결된 사용자가 없습니다.');
      }

      const users = await this.userRepo.find({
        where: { connect: user.connect },
        order: { role: 'ASC', user_id: 'ASC' },
      });

      return {
        connect: user.connect,
        users: users.map((u) => ({
          user_id: u.user_id,
          name: u.name,
          role: u.role,
          k_uid: u.k_uid,
          took_today: u.took_today,
          age: u.age,
        })),
      };
    } catch (error: unknown) {
      this.handleError(error, '사용자 목록 조회');
    }
  }

  /**
   * 기기 UID로 오늘의 전체 스케줄 조회
   */
  async getTodaySchedulesByMuid(muid: string) {
    try {
      const user = await this.userRepo.findOne({ where: { m_uid: muid } });
      if (!user) {
        throw new NotFoundException('기기에 연결된 사용자가 없습니다.');
      }

      const dayOfWeek = this.getCurrentDayOfWeek();

      const schedules = await this.scheduleRepo.find({
        where: { connect: user.connect, day_of_week: dayOfWeek },
        relations: ['medicine', 'user'],
        order: { time_of_day: 'ASC', user_id: 'ASC' },
      });

      // 시간대별로 그룹화
      const groupedSchedules = schedules.reduce(
        (acc, s) => {
          const timeOfDay = s.time_of_day || 'unknown';
          if (!acc[timeOfDay]) acc[timeOfDay] = [];
          acc[timeOfDay].push({
            user: {
              user_id: s.user_id,
              name: s.user?.name || '',
              role: s.user?.role || '',
            },
            medi_id: s.medi_id,
            medicine_name: s.medicine?.name || '',
            dose: s.dose,
          });
          return acc;
        },
        {} as Record<string, any[]>,
      );

      return {
        connect: user.connect,
        day_of_week: dayOfWeek,
        schedules: groupedSchedules,
      };
    } catch (error: unknown) {
      this.handleError(error, '스케줄 조회');
    }
  }

  /**
   * 기기 슬롯 상태 요약 조회
   */
  async getSlotStatusByMuid(muid: string) {
    try {
      const user = await this.userRepo.findOne({ where: { m_uid: muid } });
      if (!user) {
        throw new NotFoundException('기기에 연결된 사용자가 없습니다.');
      }

      const machines = await this.machineRepo.find({
        where: { owner: user.connect },
        relations: ['medicine'],
        order: { slot: 'ASC' },
      });

      const maxSlot = machines[0]?.max_slot || 3;
      const slots: Array<{
        slot: number;
        is_occupied: boolean;
        medicine: {
          medi_id: string;
          name: string;
          remain: number;
          total: number;
          warning: boolean;
        } | null;
      }> = [];

      for (let i = 1; i <= maxSlot; i++) {
        const machine = machines.find((m) => m.slot === i);
        slots.push({
          slot: i,
          is_occupied: !!machine,
          medicine: machine
            ? {
                medi_id: machine.medi_id,
                name: machine.medicine?.name || '',
                remain: machine.remain,
                total: machine.total,
                warning: machine.medicine?.warning || false,
              }
            : null,
        });
      }

      return {
        machine_id: muid,
        max_slot: maxSlot,
        occupied_slots: machines.length,
        slots,
      };
    } catch (error: unknown) {
      this.handleError(error, '슬롯 상태 조회');
    }
  }
}
