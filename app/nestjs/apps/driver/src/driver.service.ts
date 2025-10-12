import {
  Driver,
  DriverKey,
  DriverLocation,
  DriverLocationKey,
  DriverStatus,
  DriverStatusKey,
  VehicleKey,
  Vehicle,
  DriverApproval,
  DriverApprovalKey
} from '@/driver/src/interfaces';
import {
  buildGeoLocation,
  CommonService,
  patterns,
  type GetTripsOfDriverResponse,
  type TUserSession,
} from '@libs/common';
import {
  InjectRabbitMqService,
  InjectSchedulerService,
} from '@libs/common/decorators';
import { GetTripsOfDriverQueryDto } from '@libs/common/dto';
import { DriverStatusEnum } from '@libs/common/enums';
import { RabbitMQService } from '@libs/common/rabbitmq/rabbitmq.service';
import { SchedulerService } from '@libs/common/scheduler/scheduler.service';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException
} from '@nestjs/common';
import { DriverApprovalStatusEnum } from '@libs/common/enums';
import { CreateDriverDto } from '@libs/common/dto/driver/create-driver.dto';
import type { Model } from 'nestjs-dynamoose';
import { InjectModel } from 'nestjs-dynamoose';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DriverService {
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
    private readonly driverApprovalModel: Model<DriverApproval, DriverApprovalKey>,
    @InjectModel('Vehicle')
    private readonly vehicleModel: Model<Vehicle, VehicleKey>,
    @InjectRabbitMqService() private readonly rabbitMqService: RabbitMQService,
    @InjectSchedulerService()
    private readonly schedulerService: SchedulerService,
    private readonly commonService: CommonService,
  ) { }

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

    const jobName = `get-location:driver:${driverId}`;
    if (
      status === DriverStatusEnum.ONLINE ||
      status === DriverStatusEnum.BUSY
    ) {
      this.schedulerService.addJob(jobName, '*/30 * * * * *', async () => {
        const { latitude, longitude } =
          await this.commonService.getServerLocation();
        await this.updateLocationOfDriver(driverId, latitude, longitude);
      });
    } else {
      this.schedulerService.deleteJob(jobName);
    }
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

  async createDriver(data: CreateDriverDto) {
    const existed = await this.driverModel.query('userId').eq(data.userId).exec();
    if (existed.length > 0) {
      throw new BadRequestException('Driver already exists.');
    }

    const driverId = uuidv4();
    const vehicleId = uuidv4();
    const driverApprovalId = uuidv4();

    const driver: Driver = {
      driverId,
      userId: data.userId,
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
    await this.vehicleModel.create(vehicle)

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
      message: 'Driver registration submitted successfully. Awaiting admin approval.',
      driver,
      vehicle,
    };
  }
}
