import config from '@/api-gateway/config/config';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GrpcClientModule } from '@shared/grpc-client/grpc-client.module';
import { DriverModule } from './driver/driver.module';
import { TripModule } from './trip/trip.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
    }),
    GrpcClientModule,
    DriverModule,
    TripModule,
    UserModule,
  ],
})
export class ApiGatewayModule {}
