import { Metadata } from '@grpc/grpc-js';
import {
  CommonService,
  driverStatusMapping,
  getIdFromMetadata,
  TGrpcUser,
} from '@libs/common';
import { GRPC_METHODS, PATTERNS } from '@libs/common/constants';
import { GrpcUser } from '@libs/common/decorators';
import { UpdateDriverRateDto } from '@libs/common/dto/driver/update-driver-rate.dto';
import { DriverStatusEnum } from '@libs/common/enums';
import { JwtGrpcGuard } from '@libs/common/guards';
import {
  DRIVER_SERVICE_NAME,
  DriverStatus,
  GetAllTripsOfDriverRequest,
  GetDriverApprovalsRequest,
  UpdateDriverApprovalRequest,
  UpdateDriverStatusGrpcRequest,
} from '@libs/common/proto/driver';
import { CreateDriverRequest } from '@libs/common/proto/user';
import {
  Controller,
  ParseFloatPipe,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  EventPattern,
  GrpcMethod,
  MessagePattern,
  Payload,
} from '@nestjs/microservices';
import { DriverService } from './driver.service';

@Controller()
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
  async handleDriverRated(
    @Payload('updateDriverRateDto') updateDriverRateDto: UpdateDriverRateDto,
    @Payload('eventId', ParseUUIDPipe) eventId: string,
  ) {
    await this.driverService.handleDriverRatedEvent(
      updateDriverRateDto,
      eventId,
    );
  }

  @MessagePattern(PATTERNS.DRIVER_SERVICE.GET_INFO)
  async getDriverInfo(@Payload('userId', ParseUUIDPipe) userId: string) {
    return this.driverService.getDriverInfo(userId);
  }

  @MessagePattern(PATTERNS.DRIVER_SERVICE.CREATE)
  async handleCreateDriver(
    @Payload('createDriverRequest') createDriverRequest: CreateDriverRequest,
    @Payload('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.driverService.createDriver(createDriverRequest, userId);
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

  @GrpcMethod(
    DRIVER_SERVICE_NAME,
    GRPC_METHODS.DRIVER_SERVICE.UPDATE_DRIVER_STATUS_GRPC,
  )
  @UseGuards(JwtGrpcGuard)
  async updateDriverStatusGrpc(
    updateDriverStatusGrpcRequest: UpdateDriverStatusGrpcRequest,
    metadata: Metadata,
  ) {
    const driverId = getIdFromMetadata(metadata, 'driver-id', true);
    const { status } = updateDriverStatusGrpcRequest;
    await this.driverService.updateDriverStatus(
      driverId,
      driverStatusMapping[status],
    );

    if (status === DriverStatus.DRIVER_STATUS_ONLINE) {
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

  @GrpcMethod(
    DRIVER_SERVICE_NAME,
    GRPC_METHODS.DRIVER_SERVICE.GET_ALL_TRIPS_OF_DRIVER,
  )
  async getAllTripsOfDriver(
    getAllTripsOfDriverRequest: GetAllTripsOfDriverRequest,
    @GrpcUser() grpcUser: TGrpcUser,
    metadata: Metadata,
  ) {
    const driverId = getIdFromMetadata(metadata, 'driver-id', true);
    return this.driverService.getAllTripsOfDriver(
      grpcUser,
      driverId,
      getAllTripsOfDriverRequest,
    );
  }

  @GrpcMethod(
    DRIVER_SERVICE_NAME,
    GRPC_METHODS.DRIVER_SERVICE.UPDATE_DRIVER_APPROVAL,
  )
  @UseGuards(JwtGrpcGuard)
  async updateDriverApproval(
    updateDriverApprovalRequest: UpdateDriverApprovalRequest,
    metadata: Metadata,
  ) {
    const driverId = getIdFromMetadata(metadata, 'driver-id', true);
    return this.driverService.updateDriverApprovalStatus(
      updateDriverApprovalRequest,
      driverId,
    );
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
  async getLocationOfDriver(metadata: Metadata) {
    const driverId = getIdFromMetadata(metadata, 'driver-id', true);
    return this.driverService.getLocationOfDriver(driverId);
  }

  @GrpcMethod(
    DRIVER_SERVICE_NAME,
    GRPC_METHODS.DRIVER_SERVICE.GET_DRIVER_APPROVALS,
  )
  async getDriverApprovals(
    getDriverApprovalRequest: GetDriverApprovalsRequest,
  ) {
    return this.driverService.getDriversApproval(getDriverApprovalRequest);
  }

  @GrpcMethod(
    DRIVER_SERVICE_NAME,
    GRPC_METHODS.DRIVER_SERVICE.GET_DRIVER_INFO_DETAIL_BY_ID,
  )
  async getDriverInfoDetailById(metadata: Metadata) {
    const driverId = getIdFromMetadata(metadata, 'driver-id', true);
    return this.driverService.getDriverInfoDetailById(driverId);
  }
}
