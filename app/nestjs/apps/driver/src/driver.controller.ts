import {
  FindAvailableDriversDto,
  GetDriverApprovalsDto,
  GetDriverInfoDetailByIdDto,
  GetLocationOfDriverDto,
} from '@/driver/src/dto';
import { status } from '@grpc/grpc-js';
import { TGrpcUser } from '@libs/common';
import { GRPC_METHODS, PATTERNS } from '@libs/common/constants';
import { GrpcBody, GrpcUser } from '@libs/common/decorators';
import {
  CreateDriverDto,
  GetAllTripsOfDriverDto,
  UpdateDriverApprovalDto,
  UpdateDriverStatusDto,
} from '@libs/common/dto';
import { UpdateDriverRateDto } from '@libs/common/dto/driver/update-driver-rate.dto';
import { DriverStatusEnum } from '@libs/common/enums';
import { JwtGrpcGuard } from '@libs/common/guards';
import { GrpcValidationPipe } from '@libs/common/pipes';
import {
  DRIVER_SERVICE_NAME,
  UpdateDriverStatusGrpcResponse,
} from '@libs/common/proto/driver';
import {
  Controller,
  ParseFloatPipe,
  ParseUUIDPipe,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import {
  EventPattern,
  GrpcMethod,
  MessagePattern,
  Payload,
  RpcException,
} from '@nestjs/microservices';
import { DriverService } from './driver.service';

@Controller()
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @EventPattern(PATTERNS.DRIVER_SERVICE.UPDATE_STATUS)
  async updateDriverStatus(
    @Payload('driverId', ParseUUIDPipe) driverId: string,
    @Payload('status') status: DriverStatusEnum,
    @Payload('eventId') eventId: string,
    @Payload('currentLocation') currentLocation?: string,
  ) {
    await this.driverService.updateDriverStatus(
      driverId,
      status,
      eventId,
      currentLocation,
    );
  }

  @EventPattern(PATTERNS.DRIVER_SERVICE.UPDATE_RATE)
  async handleDriverRated(
    @Payload('updateDriverRateDto') updateDriverRateDto: UpdateDriverRateDto,
    @Payload('eventId', ParseUUIDPipe) eventId: string,
  ) {
    return this.driverService.handleDriverRatedEvent(
      updateDriverRateDto,
      eventId,
    );
  }

  @MessagePattern(PATTERNS.DRIVER_SERVICE.GET_INFO)
  async getDriverInfo(@Payload('userId', ParseUUIDPipe) userId: string) {
    return this.driverService.getDriverInfo(userId);
  }

  @MessagePattern(PATTERNS.DRIVER_SERVICE.GET_BY_ID)
  async getDriverInfoById(
    @Payload('driverId', ParseUUIDPipe) driverId: string,
  ) {
    return this.driverService.getDriverInfoById(driverId);
  }

  @MessagePattern(PATTERNS.DRIVER_SERVICE.CREATE)
  async handleCreateDriver(
    @Payload('createDriverDto') createDriverDto: CreateDriverDto,
    @Payload('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.driverService.createDriver(createDriverDto, userId);
  }

  @MessagePattern(PATTERNS.DRIVER_SERVICE.GET_APPROVAL_STATUS)
  async handleGetDriverApprovalStatus(@Payload() data: { userId: string }) {
    return this.driverService.getDriverApprovalStatusByUserId(data.userId);
  }

  @GrpcMethod(
    DRIVER_SERVICE_NAME,
    GRPC_METHODS.DRIVER_SERVICE.UPDATE_DRIVER_STATUS_GRPC,
  )
  @UseGuards(JwtGrpcGuard)
  @UsePipes(GrpcValidationPipe)
  async updateDriverStatusGrpc(
    @GrpcBody(UpdateDriverStatusDto)
    updateDriverStatusDto: UpdateDriverStatusDto,
  ): Promise<UpdateDriverStatusGrpcResponse> {
    const {
      status: statusData,
      driverId,
      currentLocation,
    } = updateDriverStatusDto;

    if (statusData === DriverStatusEnum.ONLINE && !currentLocation?.trim())
      throw new RpcException({
        code: status.INVALID_ARGUMENT,
        message: 'Current location is required to set status to ONLINE.',
      });

    await this.driverService.updateDriverStatus(
      driverId,
      statusData,
      currentLocation,
    );

    return {
      message: 'Status updated successfully.',
      data: {
        driverId,
        status,
      },
    };
  }

  @GrpcMethod(
    DRIVER_SERVICE_NAME,
    GRPC_METHODS.DRIVER_SERVICE.GET_ALL_TRIPS_OF_DRIVER,
  )
  @UseGuards(JwtGrpcGuard)
  @UsePipes(GrpcValidationPipe)
  async getAllTripsOfDriver(
    @GrpcBody(GetAllTripsOfDriverDto)
    getAllTripsOfDriverDto: GetAllTripsOfDriverDto,
    @GrpcUser() grpcUser: TGrpcUser,
  ) {
    return this.driverService.getAllTripsOfDriver(
      grpcUser,
      getAllTripsOfDriverDto,
    );
  }

  @GrpcMethod(
    DRIVER_SERVICE_NAME,
    GRPC_METHODS.DRIVER_SERVICE.UPDATE_DRIVER_APPROVAL,
  )
  @UseGuards(JwtGrpcGuard)
  @UsePipes(GrpcValidationPipe)
  async updateDriverApproval(
    @GrpcBody(UpdateDriverApprovalDto)
    updateDriverApprovalDto: UpdateDriverApprovalDto,
  ) {
    return this.driverService.updateDriverApprovalStatus(
      updateDriverApprovalDto,
    );
  }

  @GrpcMethod(
    DRIVER_SERVICE_NAME,
    GRPC_METHODS.DRIVER_SERVICE.FIND_AVAILABLE_DRIVERS,
  )
  @UsePipes(GrpcValidationPipe)
  async findAvailableDriversGrpc(
    @GrpcBody(FindAvailableDriversDto)
    findAvailableDriversDto: FindAvailableDriversDto,
  ) {
    const { lng, lat } = findAvailableDriversDto;
    return this.driverService.findAvailableDrivers(lat, lng);
  }

  @MessagePattern(PATTERNS.DRIVER_SERVICE.FIND_AVAILABLE)
  async findAvailableDrivers(
    @Payload('lat', ParseFloatPipe) lat: number,
    @Payload('lng', ParseFloatPipe) lng: number,
  ) {
    return this.driverService.findAvailableDrivers(lat, lng);
  }

  @GrpcMethod(
    DRIVER_SERVICE_NAME,
    GRPC_METHODS.DRIVER_SERVICE.GET_LOCATION_OF_DRIVER,
  )
  @UseGuards(JwtGrpcGuard)
  @UsePipes(GrpcValidationPipe)
  async getLocationOfDriver(
    @GrpcBody(GetLocationOfDriverDto)
    getLocationOfDriverDto: GetLocationOfDriverDto,
  ) {
    return this.driverService.getLocationOfDriver(getLocationOfDriverDto);
  }

  @GrpcMethod(
    DRIVER_SERVICE_NAME,
    GRPC_METHODS.DRIVER_SERVICE.GET_DRIVER_APPROVALS,
  )
  @UseGuards(JwtGrpcGuard)
  @UsePipes(GrpcValidationPipe)
  async getDriverApprovals(
    @GrpcBody(GetDriverApprovalsDto)
    getDriverApprovalsDto: GetDriverApprovalsDto,
  ) {
    return this.driverService.getDriversApproval(getDriverApprovalsDto);
  }

  @GrpcMethod(
    DRIVER_SERVICE_NAME,
    GRPC_METHODS.DRIVER_SERVICE.GET_DRIVER_INFO_DETAIL_BY_ID,
  )
  @UseGuards(JwtGrpcGuard)
  @UsePipes(GrpcValidationPipe)
  async getDriverInfoDetailById(
    @GrpcBody(GetDriverInfoDetailByIdDto) dto: GetDriverInfoDetailByIdDto,
  ) {
    return this.driverService.getDriverInfoDetailById(dto);
  }
}
