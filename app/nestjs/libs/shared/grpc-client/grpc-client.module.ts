import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'TRIP_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'trip',
          protoPath: join(process.cwd(), '/proto/trip.proto'),
          url: 'trip-service:50052',
        },
      },
      {
        name: 'USER_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'user',
          protoPath: join(process.cwd(), '/proto/user.proto'),
          url: 'user-service:50053',
        },
      },
      {
        name: 'DRIVER_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'driver',
          protoPath: join(process.cwd(), '/proto/driver.proto'),
          url: 'driver-service:50051',
        },
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class GrpcClientModule {}
