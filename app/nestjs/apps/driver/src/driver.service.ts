import { Driver, DriverKey } from '@/driver/src/interfaces';
import { Injectable } from '@nestjs/common';
import type { Model } from 'nestjs-dynamoose';
import { InjectModel } from 'nestjs-dynamoose';

@Injectable()
export class DriverService {
  constructor(
    @InjectModel('Driver')
    private readonly driverModel: Model<Driver, DriverKey>,
  ) {}
}
