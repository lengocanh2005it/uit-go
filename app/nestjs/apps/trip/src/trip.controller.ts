import { Metadata } from '@grpc/grpc-js';
import { getIdFromMetadata, TGrpcUser } from '@libs/common';
import { GRPC_METHODS, PATTERNS } from '@libs/common/constants';
import { GrpcUser } from '@libs/common/decorators';
import { GetTripsOfDriverQueryDto } from '@libs/common/dto';
import { JwtGrpcGuard } from '@libs/common/guards';
import {
  CreateTripRequest,
  GetEstimateRequest,
  RateTripRequest,
  TRIP_SERVICE_NAME,
  UpdateTripRequest,
  UpdateTripRequestStatusRequest,
} from '@libs/common/proto/trip';
import { Controller, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
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
  async updateTrip(updateTripRequest: UpdateTripRequest, metadata: Metadata) {
    const tripId = getIdFromMetadata(metadata, 'trip-id', true);
    return this.tripService.updateTrip(tripId, updateTripRequest);
  }

  @GrpcMethod(TRIP_SERVICE_NAME, GRPC_METHODS.TRIP_SERVICE.DELETE_TRIP)
  @UseGuards(JwtGrpcGuard)
  async cancelTrip(metadata: Metadata) {
    const tripId = getIdFromMetadata(metadata, 'trip-id', true);
    return this.tripService.cancelTrip(tripId);
  }

  @GrpcMethod(
    TRIP_SERVICE_NAME,
    GRPC_METHODS.TRIP_SERVICE.UPDATE_TRIP_REQUEST_STATUS,
  )
  @UseGuards(JwtGrpcGuard)
  async updateTripRequestStatus(
    updateTripRequestStatusRequest: UpdateTripRequestStatusRequest,
    metadata: Metadata,
  ) {
    const tripRequestId = getIdFromMetadata(metadata, 'trip-request-id', true);
    return this.tripService.updateTripRequestStatus(
      tripRequestId,
      updateTripRequestStatusRequest,
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
