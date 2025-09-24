import { CommonModule } from '@libs/common';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriverController } from './driver.controller';
import { DriverService } from './driver.service';
import { Driver } from './entities';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'driver-db',
      port: 5432,
      username: 'driver',
      password: 'password',
      database: 'driver_db',
      entities: [Driver],
      synchronize: true,
    }),
    CommonModule,
  ],
  controllers: [DriverController],
  providers: [DriverService],
})
export class DriverModule {}
