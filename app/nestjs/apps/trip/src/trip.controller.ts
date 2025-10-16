import { type TUserSession } from '@libs/common';
import { PATTERNS } from '@libs/common/constants';
import { UserSession } from '@libs/common/decorators';
import {
  CreateTripDto,
  GetTripsOfDriverQueryDto,
  UpdateOutboxEventDto,
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
import {
  Ctx,
  EventPattern,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import { TripService } from './trip.service';
import { EstimateFareDto } from '@trip-service/dto';

@Controller('trips')
export class TripController {
  constructor(private readonly tripService: TripService) {}

  @Get(':id')
  async getTrip(@Param('id', ParseUUIDPipe) tripId: string) {
    return this.tripService.getTrip(tripId);
  }

  @Post()
  async createTrip(
    @Body() createTripDto: CreateTripDto,
    @UserSession() userSession: TUserSession,
  ) {
    return this.tripService.createTrip(createTripDto, userSession);
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

  @MessagePattern(PATTERNS.DRIVER_SERVICE.GET_TRIPS)
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

  @Post('estimate')
  async estimateFare(@Body() estimateFareDto: EstimateFareDto) {
    return this.tripService.estimateFare(estimateFareDto);
  }

  @EventPattern(PATTERNS.TRIP_SERVICE.UPDATE_OUTBOX)
  async updateOutboxEvent(
    @Payload() updateOutboxEventDto: UpdateOutboxEventDto,
  ) {
    await this.tripService.updateOutboxEvent(updateOutboxEventDto);
  }
}
