import { Controller, Get, Param } from '@nestjs/common';
import { TripService } from './trip.service';

@Controller('trip')
export class TripController {
  constructor(private readonly tripService: TripService) {}

  @Get(':id')
  async getTrip(@Param('id') id: string) {
    return this.tripService.getTrip(id);
  }
}
