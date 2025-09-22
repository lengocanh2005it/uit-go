import { Module } from '@nestjs/common';
import { GrpcClientModule } from '@shared/grpc-client/grpc-client.module';
import { TripController } from './trip.controller';
import { TripService } from './trip.service';

@Module({
  imports: [GrpcClientModule],
  controllers: [TripController],
  providers: [TripService],
})
export class TripModule {}
