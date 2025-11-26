import {
  GetDriverApprovalsDto,
  GetDriverInfoDetailByIdDto,
  GetLocationOfDriverDto,
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
import { DriverApprovalSchema } from '@/driver/src/models';
import { status } from '@grpc/grpc-js';
import {
  buildGeoLocation,
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
import {
  DriverInfo,
  FindAvailableDriversResponse,
  GetAllTripsOfDriverResponse,
  GetDriverApprovalsResponse,
  DriverLocation as IDriverLocation,
  NearbyDriver,
  UpdateDriverApprovalResponse,
} from '@libs/common/proto/driver';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import type { Item, Model } from 'nestjs-dynamoose';
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
    private readonly configService: ConfigService,
    private readonly commonService: CommonService,
    @InjectRedisService() private readonly redisService: RedisService,
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
  ) {
    if (eventId?.trim()) {
      const exists = await this.getProcessedEvent(eventId);
      if (exists) {
        console.log(`Skipped duplicate event: ${eventId}`);
        return;
      }
    }

    const findDriver = await this.driverModel.get({ driverId });

    if (!findDriver) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'Driver info not found.',
      });
    }

    const findDriverStatusRecord = await this.driverStatusModel.get({
      driverId,
    });

    if (!findDriverStatusRecord?.toJSON()) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'Driver status info not found.',
      });
    }

    await this.driverStatusModel.update({ driverId }, { status: statusData });

    if (eventId?.trim()) {
      await this.processedEventModel.create({
        eventId,
        createdAt: new Date(),
      });
    }
  }

  async getDriverInfo(userId: string) {
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
    const { hash_prefix, geo_hash } = buildGeoLocation(lat, lng);
    const existingRecord = await this.driverLocationModel.get({
      driverId,
      hashPrefix: hash_prefix,
    });

    if (!existingRecord) {
      await this.driverLocationModel.create({
        geoHash: geo_hash,
        hashPrefix: hash_prefix,
        driverId,
        createdAt: new Date(),
        updatedAt: new Date(),
        lat,
        lng,
      });
    } else {
      await this.driverLocationModel.update(
        {
          driverId,
          hashPrefix: hash_prefix,
        },
        {
          updatedAt: new Date(),
          lat,
          lng,
          geoHash: geo_hash,
        },
      );
    }
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
        $SET: {
          reviewed_date: new Date(),
          status: statusData,
          note,
        },
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
    this.logger.debug(`Finding drivers for (${lat}, ${lng})`);

    const maxRadiusKm = this.configService.get<number>(
      'mechanisms.max_radius_km',
      25,
    );

    const keyLat = lat.toFixed(3);
    const keyLng = lng.toFixed(3);

    const cacheKey = `avail:${keyLat}:${keyLng}:${maxRadiusKm}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      this.logger.debug(`Cache hit for location ${lat},${lng}`);
      return JSON.parse(cached) as FindAvailableDriversResponse;
    }

    const geoDrivers = await this.redisService.geoRadiusWithDistance(
      'drivers:locations',
      lng,
      lat,
      maxRadiusKm,
      'km',
      topN * 2,
    );

    if (!geoDrivers.length) return { count: 0, drivers: [] };

    const driverIds = geoDrivers.map((d) => d.member);
    const onlineMap = await this.redisService.areDriversOnline(driverIds);
    const drivers: NearbyDriver[] = [];

    for (const d of geoDrivers) {
      if (!onlineMap[d.member]) continue;
      const pos = await this.redisService.geoPos('drivers:locations', d.member);

      if (!pos) continue;

      drivers.push({
        driverId: d.member,
        lat: pos.lat,
        lng: pos.lng,
        distanceKm: d.distance,
      });

      if (drivers.length >= topN) break;
    }

    const result: FindAvailableDriversResponse = {
      count: drivers.length,
      drivers,
    };

    await this.redisService.set(cacheKey, JSON.stringify(result), 30);

    return result;
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

    await this.driverModel.update(
      { driverId },
      {
        rating: Number(newAverage.toFixed(2)),
        totalTrip: totalTrip + 1,
        updatedAt: new Date(),
      },
    );

    await this.processedEventModel.create({
      eventId,
      createdAt: new Date(),
    });

    this.logger.log(
      `Updated driver ${driverId} rating: ${newAverage.toFixed(2)} (from ${totalTrip + 1} trips)`,
    );
  }
}
