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
import { status } from '@grpc/grpc-js';
import {
  buildGeoLocation,
  buildSearchPrefixes,
  CommonService,
  FindAvailableDriversResponse,
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
  GetAllTripsOfDriverResponse,
  GetDriverApprovalsResponse,
  DriverLocation as IDriverLocation,
} from '@libs/common/proto/driver';
import { CreateDriverRequest } from '@libs/common/proto/user';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
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
    return existed[0].toJSON();
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
      throw new NotFoundException('Driver not found for this user.');
    }

    const driver = driverRecords[0].toJSON();

    const approvalRecords = await this.driverApprovalModel
      .query('driverId')
      .eq(driver.driverId)
      .exec();

    if (approvalRecords.length === 0) {
      throw new NotFoundException('Driver approval record not found.');
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

  async createDriver(data: CreateDriverRequest, userId: string) {
    const existed = await this.driverModel.query('userId').eq(userId).exec();
    if (existed.length > 0) {
      throw new BadRequestException('Driver already exists.');
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
      licenseExpiry: data.licenseExpiry ?? new Date(),
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
    driverId: string,
  ) {
    const { status: statusData, note } = updateDriverApprovalDto;

    const driverApproval = await this.driverApprovalModel
      .query('driverId')
      .eq(driverId)
      .exec();

    if (driverApproval.length === 0) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'Driver approval record not found.',
      });
    }

    const approvalRecord = driverApproval[0];
    const updated = await this.driverApprovalModel.update(
      { driverApprovalId: approvalRecord.driverApprovalId },
      {
        status: statusData,
        note,
        reviewedDate: new Date(),
        updatedAt: new Date(),
      },
    );

    const driver: any = await this.getDriverInfoDetailById({
      driverId: approvalRecord.driverId,
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
          userId: driver.userId,
          createNotificationDto: {
            type: typeNotif,
            message: messageNotif,
            title: titleNotif,
          },
          data: {
            driverId: approvalRecord.driverId,
            userId: driver.userId,
          },
        },
      );
    }

    return {
      message: `Driver approval updated to ${statusData}`,
      data: updated,
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

  async findNearbyDrivers(lat: number, lng: number, radiusKm = 3) {
    const cacheKey = `available_drivers:${lat.toFixed(4)}:${lng.toFixed(4)}:${radiusKm}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const prefixes = buildSearchPrefixes(lat, lng, radiusKm, 5);

    if (prefixes.length === 0) {
      return { count: 0, drivers: [] };
    }

    const locationResponses: DriverLocation[][] = await Promise.all(
      prefixes.map(
        (prefix) =>
          this.driverLocationModel
            .query('hashPrefix')
            .eq(prefix)
            .exec() as Promise<DriverLocation[]>,
      ),
    );

    const locations: DriverLocation[] = locationResponses.flat();
    const latestByDriver = this.pickLatestLocationPerDriver(locations);

    const entries = await Promise.all(
      Object.values(latestByDriver).map(async (location) => {
        try {
          const distance = await this.commonService.getDistanceWithCoordinates(
            { lat, lon: lng },
            { lat: location.lat, lon: location.lng },
          );

          const statusDoc = await this.driverStatusModel.get({
            driverId: location.driverId,
          });

          const status = statusDoc?.toJSON()?.status;

          if (status === DriverStatusEnum.ONLINE && distance <= radiusKm) {
            return {
              driverId: location.driverId,
              lat: location.lat,
              lng: location.lng,
              distanceKm: distance,
            };
          }

          return null;
        } catch (error) {
          return null;
        }
      }),
    );

    const filtered = entries.filter(Boolean);

    await this.redisService.set(
      cacheKey,
      JSON.stringify({ count: filtered.length, drivers: filtered }),
      10,
    );

    return { count: filtered.length, drivers: filtered };
  }

  async findAvailableDrivers(
    lat: number,
    lng: number,
  ): Promise<FindAvailableDriversResponse> {
    try {
      this.logger.debug(
        `Finding available drivers near lat: ${lat}, lng: ${lng}`,
      );
      const maxRadiusKm = this.configService.get<number>(
        'mechanisms.max_radius_km',
        25,
      );
      const searchRadii = [3, 5, 10, 15, maxRadiusKm];

      for (const radius of searchRadii) {
        this.logger.debug(`Searching within ${radius}km radius`);
        const drivers = await this.findNearbyDrivers(lat, lng, radius);
        if (drivers?.count > 0) {
          this.logger.debug(
            `Found ${drivers.count} drivers within ${radius}km`,
          );
          return drivers;
        }
      }

      this.logger.debug('No available drivers found');
      return { count: 0, drivers: [] };
    } catch (error) {
      this.logger.error('Error finding available drivers:', error);
      throw error;
    }
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
  ): Promise<GetDriverApprovalsResponse[]> {
    const { status } = getDriverApprovalsDto;
    let driversApproval: Item<DriverApproval & DriverApprovalKey>[] = [];

    if (status) {
      driversApproval = await this.driverApprovalModel
        .scan('status')
        .eq(status)
        .exec();
    } else {
      driversApproval = await this.driverApprovalModel.scan().exec();
    }

    return driversApproval.map((driver) => {
      const toJson = driver.toJSON();
      return {
        driverApprovalId: toJson.driverApprovalId,
        status: toJson.status,
        reviewedDate: toJson.reviewedDate,
        note: toJson.note,
        driverId: toJson.driverId,
        vehicleId: toJson.vehicleId,
        createdAt: toJson.createdAt,
        updatedAt: toJson.updatedAt,
      };
    });
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

    const driverStatus = await this.driverStatusModel.get({
      driverId,
    });

    if (!driverStatus)
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

    if (!driverLocation.length)
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'Driver location info not found.',
      });

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
      driverStatus: driverStatus.toJSON() as any,
      driverApproval: driverApproval[0].toJSON() as any,
      driverLocation: driverLocation[0].toJSON() as any,
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
      this.logger.error(`Driver not found: ${driverId}`);
      throw new NotFoundException('Driver not found.');
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
