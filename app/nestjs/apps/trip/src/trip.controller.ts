import {
  CancelTripDto,
  GetEstimateDto,
  GetTripDto,
  RateTripDto,
} from '@/trip/src/dto';
import { TGrpcUser } from '@libs/common';
import { GRPC_METHODS, PATTERNS } from '@libs/common/constants';
import { GrpcBody, GrpcUser } from '@libs/common/decorators';
import {
  CreateTripDto,
  GetAllTripsOfDriverDto,
  UpdateTripDto,
  UpdateTripRequestStatusDto,
} from '@libs/common/dto';
import { JwtGrpcGuard, ThrottlerGrpcGuard } from '@libs/common/guards';
import { GrpcValidationPipe } from '@libs/common/pipes';
import { TRIP_SERVICE_NAME } from '@libs/common/proto/trip';
import { Controller, ParseUUIDPipe, UseGuards, UsePipes } from '@nestjs/common';
import { GrpcMethod, MessagePattern, Payload } from '@nestjs/microservices';
import { TripService } from './trip.service';

@Controller()
export class TripController {
  constructor(private readonly tripService: TripService) {}

  @GrpcMethod(TRIP_SERVICE_NAME, GRPC_METHODS.TRIP_SERVICE.GET_TRIP)
  @UseGuards(JwtGrpcGuard)
  @UsePipes(GrpcValidationPipe)
  async getTrip(@GrpcBody(GetTripDto) getTripDto: GetTripDto) {
    return this.tripService.getTrip(getTripDto.tripId);
  }

  @GrpcMethod(TRIP_SERVICE_NAME, GRPC_METHODS.TRIP_SERVICE.CREATE_TRIP)
  @UseGuards(JwtGrpcGuard, ThrottlerGrpcGuard)
  @UsePipes(GrpcValidationPipe)
  async createTrip(
    @GrpcBody(CreateTripDto) createTripDto: CreateTripDto,
    @GrpcUser() grpcUser: TGrpcUser,
  ) {
    return this.tripService.createTrip(createTripDto, grpcUser);
  }

  @GrpcMethod(TRIP_SERVICE_NAME, GRPC_METHODS.TRIP_SERVICE.UPDATE_TRIP)
  @UseGuards(JwtGrpcGuard)
  @UsePipes(GrpcValidationPipe)
  async updateTrip(
    @GrpcBody(UpdateTripDto)
    updateTripDto: UpdateTripDto,
    @GrpcUser() grpcUser: TGrpcUser,
  ) {
    return this.tripService.updateTrip(updateTripDto, grpcUser);
  }

  @GrpcMethod(TRIP_SERVICE_NAME, GRPC_METHODS.TRIP_SERVICE.CANCEL_TRIP)
  @UseGuards(JwtGrpcGuard)
  @UsePipes(GrpcValidationPipe)
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
  @UsePipes(GrpcValidationPipe)
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

  @MessagePattern(PATTERNS.TRIP_SERVICE.GET_TRIPS)
  async getTripsOfDriver(
    @Payload('getAllTripsOfDriverDto')
    getAllTripsOfDriverDto: GetAllTripsOfDriverDto,
    @Payload('driverId', ParseUUIDPipe) driverId: string,
  ) {
    return this.tripService.getTripsOfDriver(getAllTripsOfDriverDto, driverId);
  }

  @GrpcMethod(TRIP_SERVICE_NAME, GRPC_METHODS.TRIP_SERVICE.GET_ESTIMATE)
  @UseGuards(JwtGrpcGuard)
  @UsePipes(GrpcValidationPipe)
  async getEstimate(@GrpcBody(GetEstimateDto) getEstimateDto: GetEstimateDto) {
    return this.tripService.estimateFare(getEstimateDto);
  }

  @GrpcMethod(TRIP_SERVICE_NAME, GRPC_METHODS.TRIP_SERVICE.RATE_TRIP)
  @UseGuards(JwtGrpcGuard)
  @UsePipes(GrpcValidationPipe)
  async rateTrip(
    @GrpcBody(RateTripDto) rateTripDto: RateTripDto,
    @GrpcUser() grpcUser: TGrpcUser,
  ) {
    return this.tripService.rateTrip(rateTripDto, grpcUser);
  }
}
