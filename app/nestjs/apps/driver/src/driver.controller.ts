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
  ParseFloatPipe,
  ParseUUIDPipe,
  Patch,
  Put,
  Query,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DriverService } from './driver.service';

@Controller('drivers')
export class DriverController {
  constructor(
    private readonly driverService: DriverService,
    private readonly commonService: CommonService,
  ) {}

  @MessagePattern(patterns.driverService.updateDriverStatus)
  async updateDriverStatus(
    @Payload('driverId', ParseUUIDPipe) driverId: string,
    @Payload('status') status: DriverStatusEnum,
    @Payload('eventId', ParseUUIDPipe) eventId?: string,
  ) {
    try {
      return this.driverService.updateDriverStatus(driverId, status, eventId);
    } catch (error) {
      console.error(error);
    }
  }

  @MessagePattern(patterns.driverService.getDriverInfo)
  async getDriverInfo(@Payload('userId', ParseUUIDPipe) userId: string) {
    try {
      return this.driverService.getDriverInfo(userId);
    } catch (error) {
      console.error(error);
    }
  }
  @MessagePattern(patterns.driverService.createDriver)
  async handleCreateDriver(
    @Payload('createDriverDto') createDriverDto: CreateDriverDto,
    @Payload('userId', ParseUUIDPipe) userId: string,
  ) {
    try {
      return this.driverService.createDriver(createDriverDto, userId);
    } catch (error) {
      console.error(error);
    }
  }
  @MessagePattern(patterns.driverService.getDriverApprovalStatus)
  async handleGetDriverApprovalStatus(@Payload() data: { userId: string }) {
    try {
      const { userId } = data;
      if (!userId) {
        throw new Error('userId is missing');
      }
      const driverApproval =
        await this.driverService.getDriverApprovalStatusByUserId(userId);
      return driverApproval;
    } catch (error) {
      console.error(error);
    }
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

  @MessagePattern(patterns.driverService.findAvailableDriver)
  async findAvailableDrivers(
    @Payload('lat', ParseFloatPipe) lat: number,
    @Payload('lng', ParseFloatPipe) lng: number,
  ) {
    return this.driverService.findAvailableDrivers(lat, lng);
  }
  
    @Get(':id/location')
    async getLocationOfDriver(@Param('id', ParseUUIDPipe) driverId: string) {
      return this.driverService.getLocationOfDriver(driverId);
    }

  @Get('test')
  async test(
    @Query('lat', ParseFloatPipe) lat: number,
    @Query('lng', ParseFloatPipe) lng: number,
  ) {
    return this.driverService.findAvailableDrivers(lat, lng);
  }
}
