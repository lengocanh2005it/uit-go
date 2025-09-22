import { Module } from '@nestjs/common';
import { GrpcClientModule } from '@shared/grpc-client/grpc-client.module';
import { DriverController } from './driver.controller';
import { DriverService } from './driver.service';

@Module({
  imports: [GrpcClientModule],
  controllers: [DriverController],
  providers: [DriverService],
})
export class DriverModule {}
