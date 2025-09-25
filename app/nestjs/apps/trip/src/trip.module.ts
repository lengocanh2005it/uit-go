import { CommonModule } from '@libs/common';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { Trip, TripRating, TripRequest } from './entities';
import { TripController } from './trip.controller';
import { TripService } from './trip.service';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'trip-db',
      port: 3306,
      username: 'trip',
      password: 'password',
      database: 'trip_db',
      autoLoadEntities: true,
      entities: [Trip, TripRequest, TripRating],
      synchronize: true,
      namingStrategy: new SnakeNamingStrategy(),
    }),
    CommonModule,
  ],
  controllers: [TripController],
  providers: [TripService],
})
export class TripModule {}
