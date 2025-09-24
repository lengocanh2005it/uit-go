import { Controller } from '@nestjs/common';
import { TripService } from './trip.service';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class TripController {
  constructor(private readonly tripService: TripService) {}

  @MessagePattern('get-trip')
  async getTrip() {
    return {
      tripID: 1,
    };
  }
}
