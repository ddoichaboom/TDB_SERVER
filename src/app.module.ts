// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { DispenserModule } from './dispenser/dispenser.module';
import { User, Schedule, Medicine, Machine } from './dispenser/entities/index';

@Module({
  imports: [
    // .env 읽기 (전역)
    ConfigModule.forRoot({ isGlobal: true }),
    // DB 연결을 비동기로 설정
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get('DB_HOST'),
        port: parseInt(config.get('DB_PORT', '3306'), 10),
        username: config.get('DB_USER'),
        password: config.get('DB_PASS'),
        database: config.get('DB_NAME'),
        entities: [User, Schedule, Medicine, Machine],
        synchronize: false,
      }),
    }),
    TypeOrmModule.forFeature([User, Schedule, Medicine, Machine]),
    ScheduleModule.forRoot(),
    DispenserModule,
  ],
})
export class AppModule {}
