import {
  CreateTripDto,
  GetTripsOfDriverQueryDto,
  UpdateTripDto,
  UpdateTripRequestStatusDto,
} from '@libs/common/dto';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TripService } from './trip.service';

@Controller()
export class TripController {
  constructor(private readonly tripService: TripService) {}

  @Get(':id')
  async getTrip(@Param('id', ParseUUIDPipe) tripId: string) {
    return this.tripService.getTrip(tripId);
  }

  @Post()
  async createTrip(@Body() createTripDto: CreateTripDto) {
    return this.tripService.createTrip(createTripDto);
  }

  @Patch(':id')
  async updateTrip(
    @Body() updateTripDto: UpdateTripDto,
    @Param('id', ParseUUIDPipe) tripId: string,
  ) {
    return this.tripService.updateTrip(tripId, updateTripDto);
  }

  @Delete(':id')
  async cancelTrip(@Param('id', ParseUUIDPipe) tripId: string) {
    return this.tripService.cancelTrip(tripId);
  }

  @Patch('requests/:tripRequestId/status')
  async updateTripRequestStatus(
    @Param('tripRequestId', ParseUUIDPipe) tripRequestId: string,
    @Body() updateTripRequestStatusDto: UpdateTripRequestStatusDto,
  ) {
    return this.tripService.updateTripRequestStatus(
      tripRequestId,
      updateTripRequestStatusDto,
    );
  }

  @MessagePattern('get-trips-of-driver')
  async getTripsOfDriver(
    @Payload('getTripsOfDriverQueryDto')
    getTripsOfDriverQueryDto: GetTripsOfDriverQueryDto,
    @Payload('driverId', ParseUUIDPipe) driverId: string,
  ) {
    return this.tripService.getTripsOfDriver(
      driverId,
      getTripsOfDriverQueryDto,
    );
  }
}
