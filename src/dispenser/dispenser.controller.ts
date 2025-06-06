// dispenser.controller.ts
import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Logger,
  Param,
  Post,
} from '@nestjs/common';
import { DispenserService } from './dispenser.service';

@Controller('dispenser')
export class DispenserController {
  private readonly logger = new Logger(DispenserController.name);

  constructor(private readonly dispenserService: DispenserService) {}

  private handleError(ctx: string, error: unknown, fallbackMessage: string) {
    if (error instanceof Error) {
      this.logger.error(`${ctx} error: ${error.message}`, error.stack);
    } else {
      this.logger.error(`${ctx} unknown error`);
    }
    throw new InternalServerErrorException(fallbackMessage);
  }

  /**
   * RFID UID로 사용자 인증
   */
  @Post('verify-uid')
  async verifyUid(@Body() body: { uid: string }) {
    return this.dispenserService.authenticateByUid(body.uid);
  }

  /**
   * 복용 완료 처리
   */
  @Post('confirm')
  async confirmIntake(@Body() body: { uid: string }) {
    return this.dispenserService.confirmIntake(body.uid);
  }

  /**
   * 가족(connect) 기준 약 목록 조회
   */
  @Get('medicine/:connect')
  async getMedicineList(@Param('connect') connect: string) {
    try {
      return await this.dispenserService.getMedicineListByConnect(connect);
    } catch (error: unknown) {
      this.handleError('getMedicineList', error, '약 정보 조회 중 오류 발생');
    }
  }

  /**
   * 가족(connect) 기준 오늘 스케줄 조회
   */
  @Get('schedules/connect/:connect')
  async getTodaySchedulesByConnect(@Param('connect') connect: string) {
    try {
      return await this.dispenserService.getTodayScheduleByConnect(connect);
    } catch (error: unknown) {
      this.handleError(
        'getTodaySchedulesByConnect',
        error,
        '스케줄 조회 중 오류 발생',
      );
    }
  }

  /**
   * 특정 사용자의 오늘 스케줄 조회
   */
  @Get('schedules/user/:user_id')
  async getTodaySchedulesByUser(@Param('user_id') user_id: string) {
    try {
      return await this.dispenserService.getTodayScheduleByUser(user_id);
    } catch (error: unknown) {
      this.handleError(
        'getTodaySchedulesByUser',
        error,
        '스케줄 조회 중 오류 발생',
      );
    }
  }

  /**
   * RFID UID로 배출 목록 조회
   */
  @Post('dispense-list')
  async getDispenseList(@Body() body: { k_uid: string }) {
    try {
      return await this.dispenserService.getDispenseListByKitUid(body.k_uid);
    } catch (error: unknown) {
      this.handleError('getDispenseList', error, '배출 목록 조회 중 오류 발생');
    }
  }

  /**
   * 약 배출 결과 처리
   */
  @Post('dispense-result')
  async reportDispenseResult(
    @Body()
    body: {
      k_uid: string;
      dispenseList: { medi_id: string; dose: number }[];
    },
  ) {
    try {
      return await this.dispenserService.handleDispenseResult(
        body.k_uid,
        body.dispenseList,
      );
    } catch (error: unknown) {
      this.handleError('reportDispenseResult', error, '배출 처리 중 오류 발생');
    }
  }

  /**
   * 기기 UID로 기기 상태 조회
   */
  @Get('machine-status/:muid')
  async getMachineStatusByMuid(@Param('muid') muid: string) {
    try {
      return await this.dispenserService.getMachineStatusByMuid(muid);
    } catch (error: unknown) {
      this.handleError(
        'getMachineStatusByMuid',
        error,
        '기기 상태 조회 중 오류 발생',
      );
    }
  }

  /**
   * 기기 UID로 연결된 사용자들 조회
   */
  @Get('users/by-muid/:muid')
  async getUsersByMuid(@Param('muid') muid: string) {
    try {
      return await this.dispenserService.getUsersByMuid(muid);
    } catch (error: unknown) {
      this.handleError('getUsersByMuid', error, '유저 조회 중 오류 발생');
    }
  }

  /**
   * 기기 UID로 오늘의 전체 스케줄 조회
   */
  @Get('schedules/today/:muid')
  async getTodaySchedulesByMuid(@Param('muid') muid: string) {
    try {
      return await this.dispenserService.getTodaySchedulesByMuid(muid);
    } catch (error: unknown) {
      this.handleError(
        'getTodaySchedulesByMuid',
        error,
        '스케줄 조회 중 오류 발생',
      );
    }
  }

  /**
   * 기기별 슬롯 상태 요약 조회
   */
  @Get('slots/status/:muid')
  async getSlotStatus(@Param('muid') muid: string) {
    try {
      return await this.dispenserService.getSlotStatusByMuid(muid);
    } catch (error: unknown) {
      this.handleError('getSlotStatus', error, '슬롯 상태 조회 중 오류 발생');
    }
  }
}
