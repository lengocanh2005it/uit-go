import { patterns, type TUserSession } from '@libs/common';
import { UserSession } from '@libs/common/decorators';
import { GetTripsOfDriverQueryDto } from '@libs/common/dto';
import { DriverStatusEnum } from '@libs/common/enums';
import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { DriverService } from './driver.service';

@Controller('drivers')
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @EventPattern(patterns.driverService.updateDriverStatus)
  async updateDriverStatus(
    @Payload('driverId', ParseUUIDPipe) driverId: string,
    @Payload('status') status: DriverStatusEnum,
  ) {
    return this.driverService.updateDriverStatus(driverId, status);
  }

  @MessagePattern(patterns.driverService.getDriverInfo)
  async getDriverInfo(@Payload('userId', ParseUUIDPipe) userId: string) {
    return this.driverService.getDriverInfo(userId);
  }

  @Get(':id/trips')
  async getAllTripsOfDriver(
    @UserSession() userSession: TUserSession,
    @Param('id', ParseUUIDPipe)
    driverId: string,
    @Query() getTripsOfDriverQueryDto: GetTripsOfDriverQueryDto,
  ) {
    return this.driverService.getAllTripsOfDriver(
      userSession,
      driverId,
      getTripsOfDriverQueryDto,
    );
  }
}
