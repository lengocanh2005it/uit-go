import { GetDriversApprovalQueryDto } from '@driver-service/dto';
import { CommonService, type TUserSession } from '@libs/common';
import { PATTERNS } from '@libs/common/constants';
import { UserSession } from '@libs/common/decorators';
import { GetTripsOfDriverQueryDto } from '@libs/common/dto';
import {
  CreateDriverDto,
  UpdateDriverApprovalDto,
  UpdateDriverStatusDto,
} from '@libs/common/dto/driver';
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
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { DriverService } from './driver.service';
import { UpdateDriverRateDto } from '@libs/common/dto/driver/update-driver-rate.dto';

@Controller('drivers')
export class DriverController {
  constructor(
    private readonly driverService: DriverService,
    private readonly commonService: CommonService,
  ) {}

  @EventPattern(PATTERNS.DRIVER_SERVICE.UPDATE_STATUS)
  async updateDriverStatus(
    @Payload('driverId', ParseUUIDPipe) driverId: string,
    @Payload('status') status: DriverStatusEnum,
    @Payload('eventId') eventId: string,
  ) {
    await this.driverService.updateDriverStatus(driverId, status, eventId);
  }
  @EventPattern(PATTERNS.DRIVER_SERVICE.UPDATE_RATE)
  async handleDriverRated(@Payload() updateDriverRateDto: UpdateDriverRateDto) {
    await this.driverService.handleDriverRatedEvent(updateDriverRateDto);
  }

  @MessagePattern(PATTERNS.DRIVER_SERVICE.GET_INFO)
  async getDriverInfo(@Payload('userId', ParseUUIDPipe) userId: string) {
    return this.driverService.getDriverInfo(userId);
  }
  @MessagePattern(PATTERNS.DRIVER_SERVICE.CREATE)
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
  @MessagePattern(PATTERNS.DRIVER_SERVICE.GET_APPROVAL_STATUS)
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
    await this.driverService.updateDriverStatus(driverId, status);

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

  @MessagePattern(PATTERNS.DRIVER_SERVICE.FIND_AVAILABLE)
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

  @Get('approval')
  async getDriversApproval(
    @Query() getDriversApprovalQueryDto: GetDriversApprovalQueryDto,
  ) {
    return this.driverService.getDriversApproval(getDriversApprovalQueryDto);
  }

  @Get(':id/detail')
  async getDriverInfoDetailById(@Param('id', ParseUUIDPipe) driverId: string) {
    return this.driverService.getDriverInfoDetailById(driverId);
  }
}
