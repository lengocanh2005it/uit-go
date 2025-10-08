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
import { Injectable } from '@nestjs/common';
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
}
