import { CommonService, patterns, type TUserSession } from '@libs/common';
import { UserSession } from '@libs/common/decorators';
import { GetTripsOfDriverQueryDto } from '@libs/common/dto';
import { UpdateDriverStatusDto } from '@libs/common/dto/driver';
import { CreateDriverDto } from '@libs/common/dto/driver/create-driver.dto';
import { UpdateDriverApprovalDto } from '@libs/common/dto/driver/update-driver-approval.dto';
import { DriverStatusEnum } from '@libs/common/enums';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Put,
  Query,
} from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { DriverService } from './driver.service';

@Controller('drivers')
export class DriverController {
  constructor(
    private readonly driverService: DriverService,
    private readonly commonService: CommonService,
  ) {}

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
  @EventPattern(patterns.driverService.createDriver)
  async handleCreateDriver(
    @Payload('createDriverDto') createDriverDto: CreateDriverDto,
    @Payload('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.driverService.createDriver(createDriverDto, userId);
  }
  @MessagePattern(patterns.driverService.getDriverApprovalStatus)
  async handleGetDriverApprovalStatus(
    @Payload('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.driverService.getDriverApprovalStatusByUserId(userId);
  }

  @Patch(':id/status')
  async updateDriverStatusHttpRequest(
    @Param('id', ParseUUIDPipe) driverId: string,
    @Body() updateDriverStatusDto: UpdateDriverStatusDto,
    @UserSession() userSession: TUserSession,
  ) {
    if (userSession.sub !== driverId)
      throw new ForbiddenException('You can only update your own status.');
    const { status } = updateDriverStatusDto;
    await this.updateDriverStatus(driverId, status);

    if (status === DriverStatusEnum.ONLINE) {
      const { latitude, longitude } =
        await this.commonService.getServerLocation();
      await this.driverService.updateLocationOfDriver(
        driverId,
        latitude,
        longitude,
      );
    }

    return {
      message: 'Status updated successfully.',
      data: {
        driverId,
        status,
      },
    };
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
  @Put('approval')
  async updateDriverApproval(@Body() dto: UpdateDriverApprovalDto) {
    return this.driverService.updateDriverApprovalStatus(dto);
  }
}
