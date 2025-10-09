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
  CommonService,
  patterns,
  type GetTripsOfDriverResponse,
  type TUserSession,
} from '@libs/common';
import { InjectRabbitMqService } from '@libs/common/decorators';
import { GetTripsOfDriverQueryDto } from '@libs/common/dto';
import { DriverStatusEnum } from '@libs/common/enums';
import { RabbitMQService } from '@libs/common/rabbitmq/rabbitmq.service';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Model } from 'nestjs-dynamoose';
import { InjectModel } from 'nestjs-dynamoose';

@Injectable()
export class DriverService {
  constructor(
    @InjectModel('Driver')
    private readonly driverModel: Model<Driver, DriverKey>,
    @InjectModel('DriverStatus')
    private readonly driverStatusModel: Model<DriverStatus, DriverStatusKey>,
    @InjectModel('Vehicle')
    private readonly vehicleModel: Model<Vehicle, VehicleKey>,
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
    @InjectRabbitMqService() private readonly rabbitMqService: RabbitMQService,
    private readonly commonService: CommonService,
  ) {}

  async test() {
    const driver: Driver = {
      driverId: 'driver1',
      userId: 'user1',
      rating: 4.5,
      totalTrip: 100,
      licenseNumber: 'ABC123',
      licenseExpiry: new Date('2025-12-31'),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return this.driverModel.create(driver);
  }

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
}
