import { driverSchema } from '@/driver/src/models';
import { CommonModule } from '@libs/common';
import { Module } from '@nestjs/common';
import { DynamooseModule } from 'nestjs-dynamoose';
import { DriverController } from './driver.controller';
import { DriverService } from './driver.service';

@Module({
  imports: [
    CommonModule,
    DynamooseModule.forRoot({
      local: 'http://driver-db:8005',
      table: {
        create: true,
        waitForActive: true,
        throughput: 'ON_DEMAND',
      },
      logger: false,
    }),
    DynamooseModule.forFeature([
      {
        name: 'Driver',
        schema: driverSchema,
        options: {
          tableName: 'driver',
        },
      },
    ]),
  ],
  controllers: [DriverController],
  providers: [DriverService],
})
export class DriverModule {}
