import {
  Driver,
  DriverApproval,
  DriverApprovalKey,
  DriverKey,
  DriverLocation,
  DriverLocationKey,
  DriverStatus,
  DriverStatusKey,
  Vehicle,
  VehicleKey,
} from '@/driver/src/interfaces';
import {
  buildGeoLocation,
  buildSearchPrefixes,
  CommonService,
  FindAvailableDriversResponse,
  patterns,
  type GetTripsOfDriverResponse,
  type TUserSession,
} from '@libs/common';
import { InjectRabbitMqService } from '@libs/common/decorators';
import { GetTripsOfDriverQueryDto } from '@libs/common/dto';
import { CreateDriverDto } from '@libs/common/dto/driver/create-driver.dto';
import { UpdateDriverApprovalDto } from '@libs/common/dto/driver/update-driver-approval.dto';
import { DriverApprovalStatusEnum, DriverStatusEnum } from '@libs/common/enums';
import { RabbitMQService } from '@libs/common/rabbitmq/rabbitmq.service';
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
    private readonly configService: ConfigService,
    private readonly commonService: CommonService,
  ) { }

  async getAllTripsOfDriver(
    userSession: TUserSession,
    driverId: string,
    getTripsOfDriverQueryDto: GetTripsOfDriverQueryDto,
  ) {
    const { sub } = userSession;
    if (driverId !== sub)
      throw new ForbiddenException('You can only view your own trip list.');

    return this.rabbitMqService.send<GetTripsOfDriverResponse>(
      'TRIP_SERVICE',
      patterns.driverService.getTripsOfDriverPattern,
      {
        getTripsOfDriverQueryDto,
        driverId,
      },
    );
  }

  async updateDriverStatus(driverId: string, status: DriverStatusEnum) {
    const findDriver = await this.driverModel.get({
      driverId,
    });

    if (!findDriver) throw new NotFoundException('Driver info not found.');

    const findDriverStatusRecord = await this.driverStatusModel.get({
      driverId,
    });

    if (!findDriverStatusRecord?.toJSON())
      throw new NotFoundException('Driver status info not found.');

    await this.driverStatusModel.update(
      { driverId },
      {
        status,
      },
    );
  }

  async getDriverInfo(userId: string) {
    const [driver] = await this.driverModel.query('userId').eq(userId).exec();
    if (!driver) throw new NotFoundException('Driver info not found.');
    return driver.toJSON();
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

    return {
      record,
    };
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
      licenseExpiry: data.licenseExpiry,
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
    locations: DriverLocation[]
  ): Record<string, DriverLocation> {
    const byDriver: Record<string, DriverLocation> = {};
    for (const location of locations) {
      const key = location.driverId;
      const prevLocation = byDriver[key];
      const currentUpdated = new Date(location.updatedAt ?? Date.now()).getTime();
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
          this.driverLocationModel.query('hashPrefix').eq(prefix).exec()
        )
      );

      if (locationResponses.length === 0) {
        return { count: 0, drivers: [] };
      }

      const locations = locationResponses.flat().map((item) => item?.toJSON?.() as DriverLocation | undefined).filter((item) => item !== undefined);

      if (locations.length === 0) {
        return { count: 0, drivers: [] };
      }

      const latestByDriver = this.pickLatestLocationPerDriver(locations);

      this.logger.debug(`Found ${Object.keys(latestByDriver).length} drivers with locations`);

      const entries = await Promise.all(Object.values(latestByDriver).map(async (location) => {
        try {
          const distance = await this.commonService.getDistanceWithCoordinates(
            { lat, lon: lng },
            { lat: location.lat, lon: location.lng },
          )
          return {
            driverId: location.driverId,
            lat: location.lat,
            lng: location.lng,
            distanceKm: distance,
          };
        } catch (error) {
          this.logger.error(`Error calculating distance for driver ${location.driverId}:`, error);
          return null;
        }
      }));

      const noNullEntries = entries.filter((e) => e !== null);
      const withinRadiusEntries = noNullEntries.filter((e) => e.distanceKm <= radiusKm);

      const filtered: typeof withinRadiusEntries = [];
      for (const e of withinRadiusEntries) {
        try {
          const statusDoc = await this.driverStatusModel.get({ driverId: e.driverId });
          const status = statusDoc?.toJSON()?.status as DriverStatusEnum | undefined;
          if (status === DriverStatusEnum.ONLINE) {
            filtered.push(e);
          }
        } catch (error) {
          this.logger.error(`Error fetching status for driver ${e.driverId}:`, error);
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
      this.logger.debug(`Finding available drivers near lat: ${lat}, lng: ${lng}`);
      const maxRadiusKm = this.configService.get<number>('mechanisms.max_radius_km', 25);
      const searchRadii = [3, 5, 10, 15, maxRadiusKm];

      for (const radius of searchRadii) {
        this.logger.debug(`Searching within ${radius}km radius`);
        const drivers = await this.findNearbyDrivers(lat, lng, radius);
        if (drivers?.count > 0) {
          this.logger.debug(`Found ${drivers.count} drivers within ${radius}km`);
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
      const locationResponses = await this.driverLocationModel.query('driverId').eq(driverId).exec();

      const locations = locationResponses.map((item) => item?.toJSON?.() as DriverLocation | undefined).filter((item) => item !== undefined);

      const latestByDriver = this.pickLatestLocationPerDriver(locations);
      const location = latestByDriver[driverId];

      return location;
    } catch (error) {
      throw error;
    }
  }
}