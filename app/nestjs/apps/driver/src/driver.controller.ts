import type { TUserSession } from '@libs/common';
import { UserSession } from '@libs/common/decorators';
import { GetTripsOfDriverQueryDto } from '@libs/common/dto';
import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { DriverService } from './driver.service';

@Controller('drivers')
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

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
