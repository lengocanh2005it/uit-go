import { CreateTripDto } from '@libs/common/dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TripService {
  constructor() {}

  public createTrip = async (createTripDto: CreateTripDto) => {};
}
