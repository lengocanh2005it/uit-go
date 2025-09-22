import { Module } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { GrpcClientModule } from '@shared/grpc-client/grpc-client.module';
import { TripServiceClient } from '@shared/types/trip';
import { TripController } from './trip.controller';
import { TripService } from './trip.service';

@Module({
  imports: [GrpcClientModule],
  providers: [
    TripService,
    {
      provide: 'TRIP_SERVICE',
      useFactory: (client: ClientGrpc) =>
        client.getService<TripServiceClient>('TripService'),
      inject: ['TRIP_PACKAGE'],
    },
  ],
  controllers: [TripController],
})
export class TripModule {}
