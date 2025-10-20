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
import { GetDriversApprovalQueryDto } from '@driver-service/dto';
import {
  buildGeoLocation,
  buildSearchPrefixes,
  CommonService,
  FindAvailableDriversResponse,
  SERVICES,
  type GetTripsOfDriverResponse,
  type TUserSession,
} from '@libs/common';
import { PATTERNS } from '@libs/common/constants';
import { InjectRabbitMqService } from '@libs/common/decorators';
import { GetTripsOfDriverQueryDto } from '@libs/common/dto';
import { CreateDriverDto } from '@libs/common/dto/driver/create-driver.dto';
import { UpdateDriverApprovalDto } from '@libs/common/dto/driver/update-driver-approval.dto';
import { UpdateDriverRateDto } from '@libs/common/dto/driver/update-driver-rate.dto';
import { DriverApprovalStatusEnum, DriverStatusEnum } from '@libs/common/enums';
import { RabbitMQService } from '@libs/common/modules/rabbitmq/rabbitmq.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Model } from 'nestjs-dynamoose';
import { InjectModel } from 'nestjs-dynamoose';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DriverService {
  private readonly logger = new Logger(DriverService.name);
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
  ) {}

  async getAllTripsOfDriver(
    userSession: TUserSession,
    driverId: string,
    getTripsOfDriverQueryDto: GetTripsOfDriverQueryDto,
  ) {
    const { sub } = userSession;
    if (driverId !== sub)
      throw new ForbiddenException('You can only view your own trip list.');

    return this.rabbitMqService.send<GetTripsOfDriverResponse>(
      SERVICES.DRIVER_SERVICE,
      PATTERNS.DRIVER_SERVICE.GET_TRIPS,
      {
        getTripsOfDriverQueryDto,
        driverId,
      },
    );
  }

  async updateDriverStatus(
    driverId: string,
    status: DriverStatusEnum,
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
      throw new NotFoundException('Driver info not found.');
    }

    const findDriverStatusRecord = await this.driverStatusModel.get({
      driverId,
    });

    if (!findDriverStatusRecord?.toJSON()) {
      throw new NotFoundException('Driver status info not found.');
    }

    await this.driverStatusModel.update({ driverId }, { status });

    if (eventId?.trim()) {
      await this.processedEventModel.create({
        eventId,
        createdAt: new Date(),
      });
    }
  }

  async getDriverInfo(userId: string) {
    const existed = await this.driverModel.query('userId').eq(userId).exec();
    if (!existed.length) throw new NotFoundException('Driver info not found.');
    return existed[0].toJSON();
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

  async createDriver(data: CreateDriverDto, userId: string) {
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
      licenseExpiry: new Date(data.licenseExpiry),
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
  ) {
    const { driverId, status, note } = updateDriverApprovalDto;

    const driverApproval = await this.driverApprovalModel
      .query('driverId')
      .eq(driverId)
      .exec();

    if (driverApproval.length === 0) {
      throw new NotFoundException('Driver approval record not found.');
    }

    const approvalRecord = driverApproval[0];
    const updated = await this.driverApprovalModel.update(
      { driverApprovalId: approvalRecord.driverApprovalId },
      {
        status,
        note,
        reviewedDate: new Date(),
        updatedAt: new Date(),
      },
    );
    return {
      message: `Driver approval updated to ${status}`,
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

  async findNearbyDrivers(
    lat: number,
    lng: number,
    radiusKm = 3,
  ): Promise<FindAvailableDriversResponse> {
    try {
      const prefixes = buildSearchPrefixes(lat, lng, radiusKm, 5);
      if (prefixes.length === 0) {
        return { count: 0, drivers: [] };
      }

      this.logger.debug(`Searching with ${prefixes.length} geo prefixes`);

      const locationResponses = await Promise.all(
        prefixes.map((prefix) =>
          this.driverLocationModel.query('hashPrefix').eq(prefix).exec(),
        ),
      );

      if (locationResponses.length === 0) {
        return { count: 0, drivers: [] };
      }

      const locations = locationResponses
        .flat()
        .map((item) => item?.toJSON?.() as DriverLocation | undefined)
        .filter((item) => item !== undefined);

      if (locations.length === 0) {
        return { count: 0, drivers: [] };
      }

      const latestByDriver = this.pickLatestLocationPerDriver(locations);

      this.logger.debug(
        `Found ${Object.keys(latestByDriver).length} drivers with locations`,
      );

      const entries = await Promise.all(
        Object.values(latestByDriver).map(async (location) => {
          try {
            const distance =
              await this.commonService.getDistanceWithCoordinates(
                { lat, lon: lng },
                { lat: location.lat, lon: location.lng },
              );
            return {
              driverId: location.driverId,
              lat: location.lat,
              lng: location.lng,
              distanceKm: distance,
            };
          } catch (error) {
            this.logger.error(
              `Error calculating distance for driver ${location.driverId}:`,
              error,
            );
            return null;
          }
        }),
      );

      const noNullEntries = entries.filter((e) => e !== null);
      const withinRadiusEntries = noNullEntries.filter(
        (e) => e.distanceKm <= radiusKm,
      );

      const filtered: typeof withinRadiusEntries = [];
      for (const e of withinRadiusEntries) {
        try {
          const statusDoc = await this.driverStatusModel.get({
            driverId: e.driverId,
          });
          const status = statusDoc?.toJSON()?.status as
            | DriverStatusEnum
            | undefined;
          if (status === DriverStatusEnum.ONLINE) {
            filtered.push(e);
          }
        } catch (error) {
          this.logger.error(
            `Error fetching status for driver ${e.driverId}:`,
            error,
          );
        }
      }

      filtered.sort((a, b) => a.distanceKm - b.distanceKm);

      return {
        count: filtered.length,
        drivers: filtered,
      };
    } catch (error) {
      this.logger.error('Error in findNearbyDrivers:', error);
      throw error;
    }
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

  async getLocationOfDriver(driverId: string) {
    try {
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
      throw error;
    }
  }

  async getDriversApproval(
    getDriversApprovalQueryDto: GetDriversApprovalQueryDto,
  ) {
    const { status } = getDriversApprovalQueryDto;

    let driversApproval: any[];

    if (status) {
      driversApproval = await this.driverApprovalModel
        .scan('status')
        .eq(status)
        .exec();
    } else {
      driversApproval = await this.driverApprovalModel.scan().exec();
    }

    return driversApproval.map((driver) => driver.toJSON());
  }

  async getDriverInfoDetailById(driverId: string) {
    const driverInfo = await this.driverModel.get({ driverId });
    if (!driverInfo) throw new NotFoundException('Driver info not found.');

    const driverStatus = await this.driverStatusModel.get({
      driverId,
    });
    if (!driverStatus)
      throw new NotFoundException('Driver status info not found.');

    const driverApproval = await this.driverApprovalModel
      .query('driverId')
      .eq(driverId)
      .exec();
    if (!driverApproval.length)
      throw new NotFoundException('Driver approval info not found.');

    const driverLocation = await this.driverLocationModel
      .query('driverId')
      .eq(driverId)
      .exec();
    if (!driverLocation.length)
      throw new NotFoundException('Driver location info not found.');

    const vehicle = await this.vehicleModel
      .query('driverId')
      .eq(driverId)
      .exec();
    if (!vehicle.length) throw new NotFoundException('Vehicle info not found.');

    return {
      ...driverInfo,
      driverStatus: driverStatus.toJSON(),
      driverApproval: driverApproval[0].toJSON(),
      driverLocation: driverLocation[0].toJSON(),
      vehicle: vehicle[0].toJSON(),
    };
  }

  async getProcessedEvent(eventId: string) {
    return this.processedEventModel.get({ eventId });
  }

  async handleDriverRatedEvent(updateDriveRateDto: UpdateDriverRateDto) {
    const { driverId, rating, eventId } = updateDriveRateDto;

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
