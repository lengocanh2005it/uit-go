import { Body, Controller, Post, Req } from '@nestjs/common';
import { TripService } from './trip.service';
import { MessagePattern } from '@nestjs/microservices';
import { CreateTripDto } from '@libs/common/dto';
import { Request } from 'express';

@Controller()
export class TripController {
  constructor(private readonly tripService: TripService) {}

  @Post()
  async createTrip(@Body() createTripDto: CreateTripDto) {
    return this.tripService.createTrip(createTripDto);
  }

  @MessagePattern('get-trip')
  async getTrip() {
    return {
      tripID: 1,
    };
  }
}
