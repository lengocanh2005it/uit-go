import { TripRequestProcessor } from '@/trip/src/processors';
import { TripRequestProducer } from '@/trip/src/producers';
import { CommonModule, queueNames } from '@libs/common';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import envConfig from './configs/env.config';
import { Trip, TripRating, TripRequest } from './entities';
import { TripController } from './trip.controller';
import { TripService } from './trip.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
    }),
    TypeOrmModule.forFeature([Trip, TripRating, TripRequest]),
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
        entities: [Trip, TripRequest, TripRating],
        synchronize: true,
        namingStrategy: new SnakeNamingStrategy(),
        logging: false,
      }),
    }),
    CommonModule,
    BullModule.registerQueue({
      name: queueNames.trip.tripRequest,
    }),
  ],
  controllers: [TripController],
  providers: [TripService, TripRequestProcessor, TripRequestProducer],
})
export class TripModule {}
