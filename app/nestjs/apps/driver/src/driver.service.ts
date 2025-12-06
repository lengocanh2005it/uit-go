import {
  GetDriverApprovalsDto,
  GetDriverInfoDetailByIdDto,
  GetDriversDto,
  GetLocationOfDriverDto,
  UpdateDriverLocationDto,
} from '@/driver/src/dto';
import {
  Driver,
  DriverApproval,
  DriverApprovalKey,
  DriverKey,
  DriverLocation,
  DriverLocationKey,
  DriverStatus,
  DriverStatusKey,
  ProcessedEvent,
  ProcessedEventKey,
  Vehicle,
  VehicleKey,
} from '@/driver/src/interfaces';
import { status } from '@grpc/grpc-js';
import {
  CommonService,
  convertStringsToDates,
  generateNotificationContent,
  NotificationParams,
  SERVICES,
  TGrpcUser,
} from '@libs/common';
import { PATTERNS } from '@libs/common/constants';
import {
  InjectRabbitMqService,
  InjectRedisService,
  InjectS2Service,
} from '@libs/common/decorators';
import {
  CreateDriverDto,
  GetAllTripsOfDriverDto,
  UpdateDriverApprovalDto,
} from '@libs/common/dto';
import { UpdateDriverRateDto } from '@libs/common/dto/driver/update-driver-rate.dto';
import { DriverApprovalStatusEnum, DriverStatusEnum } from '@libs/common/enums';
import { NotificationTypeEnum } from '@libs/common/enums/notification';
import { RabbitMQService } from '@libs/common/modules/rabbitmq/rabbitmq.service';
import { RedisService } from '@libs/common/modules/redis/redis.service';
import { S2Service } from '@libs/common/modules/s2/s2.service';
import {
  DriverInfo,
  FindAvailableDriversResponse,
  GetAllTripsOfDriverResponse,
  GetDriverApprovalsResponse,
  GetDriversData,
  GetDriversResponse,
  DriverLocation as IDriverLocation,
  NearbyDriver,
  UpdateDriverApprovalResponse,
  UpdateDriverLocationResponse,
} from '@libs/common/proto/driver';
import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { omit } from 'lodash';
import type { Model } from 'nestjs-dynamoose';
import { InjectModel } from 'nestjs-dynamoose';
import CircuitBreaker from 'opossum';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DriverService {
  private readonly logger = new Logger(DriverService.name);
  private getTripsBreaker: CircuitBreaker<
    [getAllTripsOfDriverDto: GetAllTripsOfDriverDto, driverId: string],
    GetAllTripsOfDriverResponse
  >;

  constructor(
    @InjectModel('Driver')
    private readonly driverModel: Model<Driver, DriverKey>,
    @InjectModel('DriverStatus')
    private readonly driverStatusModel: Model<DriverStatus, DriverStatusKey>,
    @InjectModel('DriverLocation')
    private readonly driverLocationModel: Model<
      DriverLocation,
      DriverLocationKey
    >,
    @InjectModel('DriverApproval')
    private readonly driverApprovalModel: Model<
      DriverApproval,
      DriverApprovalKey
    >,
    @InjectModel('Vehicle')
    private readonly vehicleModel: Model<Vehicle, VehicleKey>,
    @InjectRabbitMqService() private readonly rabbitMqService: RabbitMQService,
    @InjectModel('ProcessedEvent')
    private readonly processedEventModel: Model<
      ProcessedEvent,
      ProcessedEventKey
    >,
    private readonly commonService: CommonService,
    @InjectRedisService() private readonly redisService: RedisService,
    @InjectS2Service() private readonly s2Service: S2Service,
  ) {
    this.getTripsBreaker = new CircuitBreaker(
      (getAllTripsOfDriverDto, driverId) =>
        this.rabbitMqService.send<GetAllTripsOfDriverResponse>(
          SERVICES.TRIP_SERVICE,
          PATTERNS.TRIP_SERVICE.GET_TRIPS,
          {
            getAllTripsOfDriverDto,
            driverId,
          },
        ),
      {
        errorThresholdPercentage: 50,
        resetTimeout: 10000,
      },
    );

    this.getTripsBreaker.fallback(() => ({
      data: [],
      afterCursor: null,
    }));
  }

  async getAllTripsOfDriver(
    grpcUser: TGrpcUser,
    getAllTripsOfDriverDto: GetAllTripsOfDriverDto,
  ): Promise<GetAllTripsOfDriverResponse> {
    const { sub } = grpcUser;
    const driver = await this.getDriverInfo(sub);
    return this.getTripsBreaker.fire(getAllTripsOfDriverDto, driver.driverId);
  }

  async updateDriverStatus(
    driverId: string,
    statusData: DriverStatusEnum,
    eventId?: string,
    currentLocation?: string,
    currentTripId?: string,
  ) {
    if (eventId?.trim()) {
      const exists = await this.processedEventModel.get({
        eventId: eventId.trim(),
      });
      if (exists) {
        console.log(`Skipped duplicate event: ${eventId}`);
        return;
      }
    }

    const [driver, driverStatus] = await Promise.all([
      this.driverModel.get({ driverId }),
      this.driverStatusModel.get({ driverId }),
    ]);

    if (!driver) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'Driver info not found.',
      });
    }

    if (!driverStatus?.toJSON()) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'Driver status info not found.',
      });
    }

    const vehicle = await this.vehicleModel
      .query('driverId')
      .eq(driverId)
      .exec();

    if (!vehicle.length)
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'Vehicle info not found.',
      });

    const toVehicleToJson = vehicle[0].toJSON();

    await this.driverStatusModel.update({ driverId }, {
      status: statusData,
      last_seen_at: new Date(),
      ...(currentTripId?.trim() && { current_trip_id: currentTripId }),
      vehicle_cached: {
        vehicleId: toVehicleToJson.vehicleId,
        plateNumber: toVehicleToJson.plateNumber,
        brand: toVehicleToJson.brand,
        model: toVehicleToJson.model,
        color: toVehicleToJson.color,
      },
    } as any);

    if (currentLocation?.trim() && statusData === DriverStatusEnum.ONLINE) {
      const { lon, lat } =
        await this.commonService.getCoordinates(currentLocation);
      await this.updateLocationOfDriver(driverId, lat, lon);
    }

    if (
      statusData === DriverStatusEnum.BUSY ||
      statusData === DriverStatusEnum.OFFLINE
    ) {
      await this.redisService.srem('online_drivers', driverId);
    }

    if (eventId?.trim()) {
      try {
        await this.processedEventModel.create({ eventId: eventId.trim() });
      } catch (err) {
        if (err.name !== 'ConditionalCheckFailedException') throw err;
      }
    }
  }

  async getDriverInfo(userId: string) {
    console.log('Method getDriverInfoById trong Driver Service được gọi!!!');

    const existed = await this.driverModel.query('userId').eq(userId).exec();

    if (!existed.length)
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'Driver info not found.',
      });

    return this.getDriverInfoDetailById({
      driverId: existed[0].toJSON().driverId,
    });
  }

  async getDriverInfoById(driverId: string) {
    const existed = await this.driverModel.get({ driverId });
    if (!existed)
      throw new RpcException({
        code: status.NOT_FOUND,
        message: `Driver info not found.`,
      });
    return existed.toJSON();
  }

  async getDriverApprovalStatusByUserId(userId: string) {
    const driverRecords = await this.driverModel
      .query('userId')
      .eq(userId)
      .exec();

    if (driverRecords.length === 0) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'Driver not found for this user.',
      });
    }

    const driver = driverRecords[0].toJSON();

    const approvalRecords = await this.driverApprovalModel
      .query('driverId')
      .eq(driver.driverId)
      .exec();

    if (approvalRecords.length === 0) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'Driver approval record not found.',
      });
    }

    const record = approvalRecords[0].toJSON();

    return record;
  }

  async updateLocationOfDriver(driverId: string, lat: number, lng: number) {
    const cellToken = this.s2Service.getCellId(lat, lng);

    const existingRecords = await this.driverLocationModel
      .query('driverId')
      .eq(driverId)
      .exec();

    for (const r of existingRecords) {
      if (r?.cellToken && r.cellToken !== cellToken) {
        await this.driverLocationModel.delete({
          cell_token: r.cellToken,
          driver_id: driverId,
        } as any);
      }
    }

    const existing = await this.driverLocationModel.get({
      cell_token: cellToken,
      driver_id: driverId,
    } as any);

    if (existing) {
      await this.driverLocationModel.update(
        { cellToken, driverId },
        { lat, lng },
      );
    } else {
      await this.driverLocationModel.create({
        cell_token: cellToken,
        driver_id: driverId,
        lat,
        lng,
      } as any);
    }

    await this.updateDriverLocationInRedis(driverId, lat, lng, cellToken);
  }

  async createDriver(data: CreateDriverDto, userId: string) {
    const existed = await this.driverModel.query('userId').eq(userId).exec();

    if (existed.length > 0) {
      throw new RpcException({
        code: status.ALREADY_EXISTS,
        message: 'Driver already exists.',
      });
    }

    const driverId = uuidv4();
    const vehicleId = uuidv4();
    const driverApprovalId = uuidv4();

    const driver: Driver = {
      driverId,
      userId,
      rating: 0,
      totalTrip: 0,
      licenseNumber: data.licenseNumber,
      licenseExpiry: new Date(data.licenseExpiry) ?? new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.driverModel.create(driver);

    const vehicle: Vehicle = {
      vehicleId,
      plateNumber: data.plateNumber,
      brand: data.brand,
      model: data.model,
      color: data.color,
      driverId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.vehicleModel.create(vehicle);

    await this.driverStatusModel.create({
      driverId,
      status: DriverStatusEnum.OFFLINE,
      lastSeenAt: new Date().toISOString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.driverApprovalModel.create({
      driverApprovalId,
      status: DriverApprovalStatusEnum.PENDING,
      driverId,
      vehicleId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return {
      mesasge: 'Driver created successfully.',
      data: {
        driverApprovalId,
        driverId,
      },
    };
  }

  async updateDriverApprovalStatus(
    updateDriverApprovalDto: UpdateDriverApprovalDto,
  ): Promise<UpdateDriverApprovalResponse> {
    const {
      status: statusData,
      note,
      driverApprovalId,
    } = updateDriverApprovalDto;

    const driverApproval = await this.driverApprovalModel.get({
      driverApprovalId,
    });

    if (!driverApproval) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'Driver approval record not found.',
      });
    }

    const updated = await this.driverApprovalModel.update(
      { driverApprovalId },
      {
        reviewed_date: new Date(),
        status: statusData,
        note,
      } as any,
    );

    const driverId = driverApproval.toJSON().driverId;

    const driver = await this.driverModel.get({ driverId });

    if (!driver)
      throw new RpcException({
        code: status.NOT_FOUND,
        message: `Driver info not found.`,
      });

    let typeNotif: NotificationTypeEnum | null = null;
    let params: NotificationParams = {};

    if (
      statusData === DriverApprovalStatusEnum.ACCEPTED ||
      statusData === DriverApprovalStatusEnum.REJECTED
    ) {
      typeNotif =
        statusData === DriverApprovalStatusEnum.ACCEPTED
          ? NotificationTypeEnum.DRIVER_APPROVED
          : NotificationTypeEnum.DRIVER_REJECTED;

      const { message: messageNotif, title: titleNotif } =
        generateNotificationContent(typeNotif, params);

      this.rabbitMqService.emit(
        SERVICES.NOTIFICATION_SERVICE,
        PATTERNS.NOTIFICATION_SERVICE.CREATE_NOTIFICATION,
        {
          userId: driver.toJSON().userId,
          createNotificationDto: {
            type: typeNotif,
            message: messageNotif,
            title: titleNotif,
          },
          data: {
            driverId,
            userId: driver.toJSON().userId,
          },
        },
      );

      if (statusData === DriverApprovalStatusEnum.ACCEPTED) {
        const userInfo = await this.rabbitMqService.send(
          SERVICES.USER_SERVICE,
          PATTERNS.USER_SERVICE.GET_PROFILE_BY_USER_ID,
          {
            userId: driver.toJSON().userId,
          },
        );
        const { message, title } = generateNotificationContent(
          NotificationTypeEnum.ACCOUNT_CREATED,
          {
            userName: userInfo.profile.fullName,
          },
        );

        this.rabbitMqService.emit(
          SERVICES.NOTIFICATION_SERVICE,
          PATTERNS.NOTIFICATION_SERVICE.CREATE_NOTIFICATION,
          {
            userId: driver.toJSON().userId,
            createNotificationDto: {
              type: NotificationTypeEnum.ACCOUNT_CREATED,
              message,
              title,
            },
            data: {},
          },
        );
      }
    }

    const toJson = updated.toJSON();

    return {
      message: `Driver approval updated to ${statusData}`,
      data: {
        driverApprovalId: toJson.driver_approval_id,
        status: toJson.status,
        note: toJson.note ?? undefined,
        driverId: toJson.driver_id,
        vehicleId: toJson.vehicle_id,
        createdAt: new Date(toJson.createdAt),
        updatedAt: new Date(toJson.updatedAt),
        reviewedDate: new Date(toJson.reviewed_date) ?? undefined,
      },
    };
  }

  pickLatestLocationPerDriver(
    locations: DriverLocation[],
  ): Record<string, DriverLocation> {
    const byDriver: Record<string, DriverLocation> = {};

    for (const location of locations) {
      const key = location.driverId;
      const prevLocation = byDriver[key];
      const currentUpdated = new Date(
        location.updatedAt ?? Date.now(),
      ).getTime();

      const prevUpdated = prevLocation
        ? new Date(prevLocation.updatedAt ?? 0).getTime()
        : -1;

      if (!prevLocation || currentUpdated > prevUpdated) {
        byDriver[key] = location;
      }
    }

    return byDriver;
  }

  async findAvailableDrivers(
    lat: number,
    lng: number,
    topN = 10,
  ): Promise<FindAvailableDriversResponse> {
    const density = await this.getDriverDensity(lat, lng);
    const k = this.chooseKFromDensity(density);

    const centerCell = this.s2Service.getCellId(lat, lng);
    const frontierCells = this.s2Service.getKRing(centerCell, k);

    const cellResults = await Promise.all(
      frontierCells.map((cell) =>
        this.driverLocationModel.query('cellToken').eq(cell).exec(),
      ),
    );

    const locations = cellResults.flat();
    if (!locations.length) {
      return { count: 0, drivers: [] };
    }

    const driverIds = [...new Set(locations.map((x) => x.driverId))];

    const statusRecords = await this.driverStatusModel.batchGet(
      driverIds.map((id) => ({ driverId: id })),
    );

    const statusMap = new Map(
      statusRecords.map((s) => [s.toJSON().driver_id, s]),
    );

    const drivers: NearbyDriver[] = [];

    for (const d of locations) {
      const status = statusMap.get(d.driverId);
      if (!status || status.status !== DriverStatusEnum.ONLINE) continue;

      const distanceMeters = this.s2Service.computeDistance(
        lat,
        lng,
        d.lat,
        d.lng,
      );

      drivers.push({
        driverId: d.driverId,
        lat: d.lat,
        lng: d.lng,
        distanceKm: distanceMeters / 1000,
        vehicle: status.toJSON().vehicle_cached,
      });
    }

    const sorted = drivers
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, topN);

    return { count: sorted.length, drivers: sorted };
  }

  async getLocationOfDriver(
    getLocationOfDriverDto: GetLocationOfDriverDto,
  ): Promise<IDriverLocation> {
    try {
      const { driverId } = getLocationOfDriverDto;

      const locationResponses = await this.driverLocationModel
        .query('driverId')
        .eq(driverId)
        .exec();

      const locations = locationResponses
        .map((item) => item?.toJSON?.() as DriverLocation | undefined)
        .filter((item) => item !== undefined);

      const latestByDriver = this.pickLatestLocationPerDriver(locations);
      const location = latestByDriver[driverId];

      return location;
    } catch (error) {
      throw new RpcException({
        code: status.INTERNAL,
        message: error?.message || 'Intenral Server Error',
      });
    }
  }

  async getDriversApproval(
    getDriverApprovalsDto: GetDriverApprovalsDto,
  ): Promise<GetDriverApprovalsResponse> {
    const { status } = getDriverApprovalsDto;
    let driversApproval: any[] = [];

    if (status) {
      driversApproval = await this.driverApprovalModel
        .scan('status')
        .eq(status)
        .exec();
    } else {
      driversApproval = await this.driverApprovalModel.scan().exec();
    }

    const approvals = driversApproval.map((driver) => {
      const toJson = driver.toJSON();
      return {
        driverApprovalId: toJson.driverApprovalId,
        status: toJson.status,
        reviewedDate: toJson?.reviewedDate
          ? new Date(toJson?.reviewedDate)
          : undefined,
        note: toJson.note,
        driverId: toJson.driverId,
        vehicleId: toJson.vehicleId,
        createdAt: new Date(toJson.createdAt),
        updatedAt: new Date(toJson.updatedAt),
      };
    });

    return { approvals };
  }

  async getDriverInfoDetailById(
    dto: GetDriverInfoDetailByIdDto,
  ): Promise<DriverInfo> {
    const { driverId } = dto;
    const driverInfo = await this.driverModel.get({ driverId });

    if (!driverInfo)
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'Driver info not found.',
      });

    const driverStatus = await this.driverStatusModel
      .query('driverId')
      .eq(driverId)
      .exec();

    if (!driverStatus.length)
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'Driver status info not found.',
      });

    const driverApproval = await this.driverApprovalModel
      .query('driverId')
      .eq(driverId)
      .exec();

    if (!driverApproval.length)
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'Driver approval info not found.',
      });

    const driverLocation = await this.driverLocationModel
      .query('driverId')
      .eq(driverId)
      .exec();

    const vehicle = await this.vehicleModel
      .query('driverId')
      .eq(driverId)
      .exec();

    if (!vehicle.length)
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'Vehicle info not found.',
      });

    return {
      ...(driverInfo.toJSON() as any),
      driverStatus: driverStatus[0].toJSON() as any,
      driverApproval: driverApproval[0].toJSON() as any,
      ...(driverLocation?.length > 0 && {
        driverLocation: driverLocation[0].toJSON() as any,
      }),
      vehicle: vehicle[0].toJSON() as any,
    };
  }

  async getProcessedEvent(eventId: string) {
    return this.processedEventModel.get({ eventId });
  }

  async handleDriverRatedEvent(
    updateDriveRateDto: UpdateDriverRateDto,
    eventId: string,
  ) {
    const { driverId, rating } = updateDriveRateDto;

    const processed = await this.getProcessedEvent(eventId);

    if (processed) {
      this.logger.warn(`Duplicate driver rating event skipped: ${eventId}`);
      return;
    }

    const driver = await this.driverModel.get({ driverId });

    if (!driver) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'Driver not found.',
      });
    }

    const driverData = driver.toJSON();
    const currentRating = driverData.rating ?? 0;
    const totalTrip = driverData.totalTrip ?? 0;

    const newAverage =
      totalTrip === 0
        ? rating
        : (currentRating * totalTrip + rating) / (totalTrip + 1);

    await this.driverModel.update({ driverId }, {
      rating: Number(newAverage.toFixed(2)),
      total_trip: totalTrip + 1,
      updatedAt: new Date(),
    } as any);

    await this.processedEventModel.create({
      eventId,
    });

    this.logger.log(
      `Updated driver ${driverId} rating: ${newAverage.toFixed(2)} (from ${totalTrip + 1} trips)`,
    );
  }

  async updateDriverLocation(
    updateDriverLocationDto: UpdateDriverLocationDto,
    grpcUser: TGrpcUser,
  ): Promise<UpdateDriverLocationResponse> {
    const { currentLocation } = updateDriverLocationDto;
    const { sub } = grpcUser;

    const driverInfo = await this.getDriverInfo(sub);
    if (!driverInfo) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: `Driver info not found.`,
      });
    }

    const { lat, lon } =
      await this.commonService.getCoordinates(currentLocation);

    const newCell = this.s2Service.getCellId(lat, lon);

    await this.updateDriverLocationInRedis(
      driverInfo.driverId,
      lat,
      lon,
      newCell,
    );

    await this.driverLocationModel.update(
      { driverId: driverInfo.driverId, cellToken: newCell },
      {
        cell_token: newCell,
        lat,
        lng: lon,
      } as any,
      { return: 'item' },
    );

    return {
      message: 'Your location has been successfully updated on the system.',
      success: true,
      data: { lat, lng: lon },
    };
  }

  async getDrivers(getDriversDto: GetDriversDto): Promise<GetDriversResponse> {
    const { status } = getDriversDto;

    let driverStatusList: any[];

    if (status) {
      driverStatusList = await this.driverStatusModel
        .scan('status')
        .eq(status)
        .exec();
    } else {
      driverStatusList = await this.driverStatusModel.scan().exec();
    }

    const driverIds = driverStatusList
      .map((ds) => ds.driverId)
      .filter((id) => id);

    if (driverIds.length === 0)
      return {
        drivers: [],
      };

    const drivers = await this.driverModel.batchGet(driverIds);

    const driverLocationsArrays = await Promise.all(
      driverIds.map((driverId) =>
        this.driverLocationModel
          .query('driver_id')
          .eq(driverId)
          .using('GSI_Driver')
          .exec(),
      ),
    );

    const driverLocations: any[] = driverLocationsArrays.flat();

    const merged: GetDriversData[] = drivers.map((driver) => {
      const statusInfo = driverStatusList.find(
        (ds) => ds.driverId === driver.toJSON().driver_id,
      );

      const locationInfo = driverLocations.find(
        (dl) => dl.driverId === driver.toJSON().driver_id,
      );

      const driverJson = driver.toJSON();

      return {
        userId: driverJson.user_id,
        driverId: driverJson.driver_id,
        totalTrip: driverJson.toal_trip,
        rating: driverJson.rating,
        licenseExpiry: new Date(driverJson.license_expiry),
        licenseNumber: driverJson.license_number,
        status: statusInfo?.status,
        lastSeenAt: statusInfo?.lastSeenAt
          ? new Date(statusInfo?.lastSeenAt)
          : undefined,
        createdAt: new Date(driver.toJSON().createdAt),
        updatedAt: new Date(driver.toJSON().updatedAt),
        vehicleCached: statusInfo?.vehicleCached ?? undefined,
        location: locationInfo
          ? { lat: locationInfo.lat, lng: locationInfo.lng }
          : undefined,
      };
    });

    return {
      drivers: merged,
    };
  }

  async getDriverInfoDetail(dto: GetDriverInfoDetailByIdDto) {
    const driverInfo = await this.getDriverInfoDetailById(dto);

    const userInfo = await this.rabbitMqService.send(
      SERVICES.USER_SERVICE,
      PATTERNS.USER_SERVICE.GET_PROFILE_BY_USER_ID,
      {
        userId: driverInfo.userId,
      },
    );

    const formattedUser = {
      ...omit(userInfo, ['password']),
      driverInfo,
    };

    return convertStringsToDates(formattedUser);
  }

  async areDriversOnline(driverIds: string[]): Promise<Map<string, boolean>> {
    const onlineMap = new Map<string, boolean>();
    const driverStatusRecords = await this.driverStatusModel.batchGet(
      driverIds.map((id) => ({ driverId: id })),
    );
    driverIds.forEach((id) => {
      const record = driverStatusRecords.find((r) => r.driverId === id);
      onlineMap.set(id, record?.status === DriverStatusEnum.ONLINE);
    });
    return onlineMap;
  }

  async getDriverDensity(lat: number, lng: number): Promise<number> {
    const centerCell = this.s2Service.getCellId(lat, lng);

    const coarseCell = this.s2Service.getParentCell(centerCell, 14);

    const cells = this.s2Service.getKRing(coarseCell, 1);

    const keys = cells.map((c) => `density:${c}`);
    const densities = await this.redisService.getClient().mget(keys);

    const driversCount = densities.reduce(
      (sum, v) => sum + (v ? parseInt(v, 10) : 0),
      0,
    );

    const area = Math.PI * 400 * 400;

    return driversCount / area;
  }

  chooseKFromDensity(density: number): number {
    if (density > 0.00003) return 2;
    if (density > 0.00001) return 4;
    return 6;
  }

  private async updateDriverLocationInRedis(
    driverId: string,
    lat: number,
    lng: number,
    newCell: string,
  ): Promise<void> {
    const redis = this.redisService.getClient();

    const driverCellKey = `driver:${driverId}:cell`;
    const oldCell = await redis.get(driverCellKey);

    if (oldCell && oldCell !== newCell) {
      await redis.decr(`density:${oldCell}`);
    }

    await redis.incr(`density:${newCell}`);
    await redis.set(driverCellKey, newCell);

    await redis.hset(`driver:${driverId}:location`, {
      lat,
      lng,
      cell: newCell,
      updatedAt: Date.now(),
    });
  }
}
