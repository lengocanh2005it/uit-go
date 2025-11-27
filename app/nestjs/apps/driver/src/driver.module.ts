import { CommonModule } from '@libs/common';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DynamooseModule } from 'nestjs-dynamoose';
import envConfig from './configs/env.config';
import { DriverController } from './driver.controller';
import { DriverService } from './driver.service';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import {
  DriverApprovalSchema,
  DriverLocationSchema,
  DriverSchema,
  DriverStatusSchema,
  ProcessedEventSchema,
  VehicleSchema,
} from './models';

@Module({
  imports: [
    CommonModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
    }),
    DynamooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        local: configService.get<string>('aws.local_url', ''),
        table: {
          create: true,
          waitForActive: true,
          throughput: 'ON_DEMAND',
        },
        logger: false,
      }),
    }),
    DynamooseModule.forFeature([
      {
        name: 'Driver',
        schema: DriverSchema,
        options: {
          tableName: 'driver',
        },
      },
      {
        name: 'DriverStatus',
        schema: DriverStatusSchema,
        options: {
          tableName: 'driver_status',
        },
      },
      {
        name: 'Vehicle',
        schema: VehicleSchema,
        options: {
          tableName: 'vehicle',
        },
      },
      {
        name: 'DriverApproval',
        schema: DriverApprovalSchema,
        options: {
          tableName: 'driver_approval',
        },
      },
      {
        name: 'DriverLocation',
        schema: DriverLocationSchema,
        options: {
          tableName: 'driver_location',
        },
      },
      {
        name: 'ProcessedEvent',
        schema: ProcessedEventSchema,
        options: {
          tableName: 'processed_event',
        },
      },
    ]),
    PrometheusModule.register(),
  ],
  controllers: [DriverController],
  providers: [DriverService],
})
export class DriverModule {}
