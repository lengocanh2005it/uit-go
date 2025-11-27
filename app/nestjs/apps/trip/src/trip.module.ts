import {
  DriverAssignmentConsumer,
  DriverAssignmentDLQConsumer,
} from '@/trip/src/consumers';
import {
  TripRequestProcessor,
  TripStatusProcessor,
} from '@/trip/src/processors';
import {
  DriverAssignmentProducer,
  TripRequestProducer,
  TripStatusProducer,
} from '@/trip/src/producers';
import { CommonModule } from '@libs/common';
import { QueueNames } from '@libs/common/constants';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueNamesOfTripService } from '@trip-service/constants';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import envConfig from './configs/env.config';
import { OutboxEvent, Trip, TripRating, TripRequest } from './entities';
import { TripController } from './trip.controller';
import { TripService } from './trip.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
    }),
    TypeOrmModule.forFeature([Trip, TripRating, TripRequest, OutboxEvent]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('database.host', 'localhost'),
        port: configService.get<number>('database.port', 3306),
        username: configService.get<string>('database.username', 'trip'),
        password: configService.get<string>('database.password', 'password'),
        database: configService.get<string>('database.name', 'trip_db'),
        autoLoadEntities: true,
        entities: [Trip, TripRequest, TripRating, OutboxEvent],
        synchronize: true,
        namingStrategy: new SnakeNamingStrategy(),
        logging: false,
      }),
    }),
    CommonModule,
    BullModule.registerQueue(
      {
        name: QueueNamesOfTripService.tripRequest,
      },
      {
        name: QueueNames.OUTBOX_EVENT_QUEUE,
      },
      {
        name: QueueNamesOfTripService.tripStatus,
      },
      {
        name: QueueNamesOfTripService.driverAssigment,
      },
    ),
    PrometheusModule.register(),
  ],
  controllers: [TripController],
  providers: [
    TripService,
    TripRequestProcessor,
    TripRequestProducer,
    TripStatusProcessor,
    TripStatusProducer,
    DriverAssignmentProducer,
    DriverAssignmentConsumer,
    DriverAssignmentDLQConsumer,
  ],
})
export class TripModule {}
