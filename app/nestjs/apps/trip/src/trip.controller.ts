import { CancelTripDto } from '@/trip/src/dto';
import { Metadata } from '@grpc/grpc-js';
import { getIdFromMetadata, TGrpcUser } from '@libs/common';
import { GRPC_METHODS, PATTERNS } from '@libs/common/constants';
import { GrpcBody, GrpcUser } from '@libs/common/decorators';
import {
  GetTripsOfDriverQueryDto,
  UpdateTripDto,
  UpdateTripRequestStatusDto,
} from '@libs/common/dto';
import { JwtGrpcGuard } from '@libs/common/guards';
import { GrpcValidationPipe } from '@libs/common/pipes';
import {
  CreateTripRequest,
  GetEstimateRequest,
  RateTripRequest,
  TRIP_SERVICE_NAME,
} from '@libs/common/proto/trip';
import {
  Controller,
  ParseUUIDPipe,
  Post,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { GrpcMethod, MessagePattern, Payload } from '@nestjs/microservices';
import { TripService } from './trip.service';

@Controller()
export class TripController {
  constructor(private readonly tripService: TripService) {}

  @GrpcMethod(TRIP_SERVICE_NAME, GRPC_METHODS.TRIP_SERVICE.GET_TRIP)
  @UseGuards(JwtGrpcGuard)
  async getTrip(metadata: Metadata) {
    const tripId = getIdFromMetadata(metadata, 'trip-id', true);
    return this.tripService.getTrip(tripId);
  }

  @GrpcMethod(TRIP_SERVICE_NAME, GRPC_METHODS.TRIP_SERVICE.CREATE_TRIP)
  @UseGuards(JwtGrpcGuard)
  @Post()
  async createTrip(
    createTripRequest: CreateTripRequest,
    @GrpcUser() grpcUser: TGrpcUser,
  ) {
    return this.tripService.createTrip(createTripRequest, grpcUser);
  }

  @GrpcMethod(TRIP_SERVICE_NAME, GRPC_METHODS.TRIP_SERVICE.UPDATE_TRIP)
  @UseGuards(JwtGrpcGuard)
  @UsePipes(GrpcValidationPipe)
  async updateTrip(
    @GrpcBody(UpdateTripDto)
    updateTripDto: UpdateTripDto,
  ) {
    return this.tripService.updateTrip(updateTripDto);
  }

  @GrpcMethod(TRIP_SERVICE_NAME, GRPC_METHODS.TRIP_SERVICE.CANCEL_TRIP)
  @UseGuards(JwtGrpcGuard)
  async cancelTrip(
    @GrpcBody(CancelTripDto) cancelTripDto: CancelTripDto,
    @GrpcUser() grpcUser: TGrpcUser,
  ) {
    const { tripId } = cancelTripDto;
    return this.tripService.cancelTrip(tripId, grpcUser);
  }

  @GrpcMethod(
    TRIP_SERVICE_NAME,
    GRPC_METHODS.TRIP_SERVICE.UPDATE_TRIP_REQUEST_STATUS,
  )
  @UseGuards(JwtGrpcGuard)
  async updateTripRequestStatus(
    @GrpcBody(UpdateTripRequestStatusDto)
    updateTripRequestStatusDto: UpdateTripRequestStatusDto,
    @GrpcUser() grpcUser: TGrpcUser,
  ) {
    return this.tripService.updateTripRequestStatus(
      updateTripRequestStatusDto,
      grpcUser,
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

  @GrpcMethod(TRIP_SERVICE_NAME, GRPC_METHODS.TRIP_SERVICE.GET_ESTIMATE)
  @UseGuards(JwtGrpcGuard)
  async getEstimate(getEstimateRequest: GetEstimateRequest) {
    return this.tripService.estimateFare(getEstimateRequest);
  }

  @GrpcMethod(TRIP_SERVICE_NAME, GRPC_METHODS.TRIP_SERVICE.RATE_TRIP)
  @UseGuards(JwtGrpcGuard)
  async rateTrip(
    rateTripRequest: RateTripRequest,
    metadata: Metadata,
    @GrpcUser() grpcUser: TGrpcUser,
  ) {
    const tripId = getIdFromMetadata(metadata, 'trip-id', true);
    return this.tripService.rateTrip(tripId, rateTripRequest, grpcUser);
  }
}
