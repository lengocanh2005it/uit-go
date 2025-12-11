import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { CommonModule } from '@libs/common';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import * as https from 'https';
import { DynamooseModule } from 'nestjs-dynamoose';
import envConfig from './configs/env.config';
import { DriverController } from './driver.controller';
import { DriverService } from './driver.service';
import {
  DriverApprovalSchema,
  DriverLocationSchema,
  DriverRealtimeInfoSchema,
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
      useFactory: (configService: ConfigService) => {
        const dynamoDb = new DynamoDB({
          region: 'ap-southeast-1',
          endpoint: configService.get<string>('aws.local_url', ''),
          requestHandler: new NodeHttpHandler({
            httpsAgent: new https.Agent({
              maxSockets: 5000,
            }),
            connectionTimeout: 10000,
            socketTimeout: 10000,
            socketAcquisitionWarningTimeout: 30000,
          }),
        });

        return {
          ddb: dynamoDb,
          table: {
            create: true,
            waitForActive: true,
            throughput: 'ON_DEMAND',
          },
          logger: false,
        };
      },
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
      {
        name: 'DriverRealtimeInfo',
        schema: DriverRealtimeInfoSchema,
        options: {
          tableName: 'driver_realtime_info',
        },
      },
    ]),
    PrometheusModule.register(),
  ],
  controllers: [DriverController],
  providers: [DriverService],
})
export class DriverModule {}
