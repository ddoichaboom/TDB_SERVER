import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Schedule } from './entities/schedule.entity';
import { Medicine } from './entities/medicine.entity';
import { Machine } from './entities/machine.entity';
import { DispenserService } from './dispenser.service';
import { DispenserController } from './dispenser.controller';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Schedule, Medicine, Machine]),
    ScheduleModule.forRoot(),
  ],
  controllers: [DispenserController],
  providers: [DispenserService],
})
export class DispenserModule {}
