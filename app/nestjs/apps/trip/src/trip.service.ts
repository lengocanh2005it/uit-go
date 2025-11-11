import { TripRequestProducer } from '@/trip/src/producers';
import { status } from '@grpc/grpc-js';
import { CommonService, ForbiddenTripStatus } from '@libs/common';
import { AggregateTypes, EventTypes, PATTERNS } from '@libs/common/constants';
import { InjectRabbitMqService } from '@libs/common/decorators';
import {
  CreateOutboxDto,
  CreateTripRequestDto,
  GetTripsOfDriverQueryDto,
} from '@libs/common/dto';
import { DriverStatusEnum, TripStatusEnum } from '@libs/common/enums';
import { RabbitMQService } from '@libs/common/modules/rabbitmq/rabbitmq.service';
import {
  CreateTripRequest,
  GetEstimateRequest,
  RateTripRequest,
  TripRequestStatus,
  TripStatus,
  UpdateTripRequest,
  UpdateTripRequestStatusRequest,
} from '@libs/common/proto/trip';
import {
  FindAvailableDriversResponse,
  formatCurrencyVND,
  GetTripsOfDriverResponse,
  SERVICES,
  TGrpcUser,
  tripRequestStatusMapping,
  tripStatusMapping,
} from '@libs/common/utils';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import CircuitBreaker from 'opossum';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { buildPaginator } from 'typeorm-cursor-pagination';
import { OutboxEvent, Trip, TripRating, TripRequest } from './entities';

@Injectable()
export class TripService {
  private findDriversBreaker: CircuitBreaker<
    [payload: { lat: number; lng: number }],
    FindAvailableDriversResponse
  >;

  constructor(
    @InjectRepository(Trip) private readonly tripRepository: Repository<Trip>,
    @InjectRepository(TripRequest)
    private readonly tripRequestRepository: Repository<TripRequest>,
    @InjectRabbitMqService() private readonly rabbitMqService: RabbitMQService,
    private readonly tripRequestProducer: TripRequestProducer,
    private readonly commonService: CommonService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.findDriversBreaker = new CircuitBreaker(
      (payload) =>
        this.rabbitMqService.send(
          SERVICES.DRIVER_SERVICE,
          PATTERNS.DRIVER_SERVICE.FIND_AVAILABLE,
          payload,
        ),
      {
        errorThresholdPercentage: 50,
        resetTimeout: 10000,
      },
    );

    this.findDriversBreaker.fallback(() => ({
      count: 0,
      drivers: [],
    }));
  }

  public getTrip = async (tripId: string) => {
    return this.findTripById(tripId);
  };

  public createTrip = async (
    createTripRequest: CreateTripRequest,
    userSession: TGrpcUser,
  ) => {
    const { sub } = userSession;
    const { destinationAddress, originAddress, note } = createTripRequest;

    const originAddressGeoCode =
      await this.commonService.getCoordinates(originAddress);

    const destinationAddressGeoCode =
      await this.commonService.getCoordinates(destinationAddress);

    const availableDrivers = await this.findDriversBreaker.fire({
      lat: originAddressGeoCode.lat,
      lng: originAddressGeoCode.lon,
    });

    if (availableDrivers.count === 0) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'No available drivers found nearby.',
      });
    }

    const driver = availableDrivers.drivers[0];

    const fareEstimate = await this.commonService.getEstimatedFare(
      originAddress,
      destinationAddress,
    );

    const newTrip = this.tripRepository.create({
      originAddress,
      destinationAddress,
      originLat: originAddressGeoCode?.lat ?? 0,
      originLng: originAddressGeoCode?.lon ?? 0,
      destinationLat: destinationAddressGeoCode?.lat ?? 0,
      destinationLng: destinationAddressGeoCode?.lon ?? 0,
      fareEstimate,
      fareFinal: fareEstimate,
      driverId: driver.driverId,
      passengerId: sub,
      note,
    });

    await this.tripRepository.save(newTrip);

    const now = new Date();
    const expiresTime = new Date(now);
    expiresTime.setMinutes(now.getMinutes() + 15);

    const newTripRequesst = await this.createTripRequest(
      {
        expiresTime,
        tripId: newTrip.id,
      },
      newTrip,
    );

    await this.tripRequestProducer.processTripRequest(
      {
        tripRequestId: newTripRequesst.id,
      },
      15000,
    );

    return {
      success: true,
      message: 'Trip created successfully.',
      data: {
        id: newTrip.id,
        status: newTrip.status,
        customer: {
          id: sub,
        },
        origin: {
          address: originAddress,
          lat: originAddressGeoCode.lat,
          lon: originAddressGeoCode.lon,
        },
        destination: {
          address: destinationAddress,
          lat: destinationAddressGeoCode.lat,
          lon: destinationAddressGeoCode.lon,
        },
        distance_km: await this.commonService.getDistance(
          originAddress,
          destinationAddress,
        ),
        estimated_price: formatCurrencyVND(fareEstimate),
        created_at: newTrip.createdAt,
      },
    };
  };

  public updateTrip = async (
    tripId: string,
    updateTripDto: UpdateTripRequest,
  ) => {
    return this.dataSource.transaction(async (manager) => {
      const tripRepo = manager.getRepository(Trip);
      const trip = await tripRepo.findOne({
        where: {
          id: tripId,
        },
      });

      if (!trip)
        throw new RpcException({
          code: status.NOT_FOUND,
          message: 'Trip not found.',
        });

      const {
        destinationAddress,
        status: statusDto,
        note,
        fareFinal,
      } = updateTripDto;

      if (
        trip.status === TripStatusEnum.CANCELLED ||
        trip.status === TripStatusEnum.COMPLETED
      )
        throw new RpcException({
          code: status.PERMISSION_DENIED,
          message: `Trip has been ${trip.status === TripStatusEnum.CANCELLED ? 'cancelled' : 'completed'} and cannot be modified.`,
        });

      if (trip.status === TripStatusEnum.ONGOING && destinationAddress) {
        throw new RpcException({
          code: status.PERMISSION_DENIED,
          message:
            'Destination address cannot be changed while the trip is ongoing.',
        });
      }

      if (destinationAddress) {
        const { lat, lon } =
          await this.commonService.getCoordinates(destinationAddress);

        trip.destinationLat = lat || trip.destinationLat;
        trip.destinationLng = lon || trip.destinationLng;

        const newEstimateFare = await this.commonService.getEstimatedFare(
          trip.originAddress,
          destinationAddress,
        );

        trip.fareEstimate = newEstimateFare || trip.fareEstimate;
        trip.fareFinal = newEstimateFare || trip.fareEstimate;
      }

      trip.status = statusDto ? tripStatusMapping[statusDto] : trip.status;
      trip.note = note || trip.note;
      trip.destinationAddress = destinationAddress || trip.destinationAddress;
      if (!destinationAddress) trip.fareFinal = fareFinal || trip.fareFinal;

      await this.tripRepository.save(trip);

      if (statusDto === TripStatus.TRIP_STATUS_COMPLETED) {
        await this.createNewOutboxEvent(
          {
            eventType: EventTypes.UPDATE_DRIVER_STATUS,
            payload: {
              driverId: trip.driverId,
              status: DriverStatusEnum.ONLINE,
            },
            aggregateId: tripId,
            aggregateType: AggregateTypes.TRIP,
          },
          manager,
        );
      }

      return trip;
    });
  };

  public cancelTrip = async (tripId: string) => {
    const trip = await this.findTripById(tripId);

    const forbiddenMessages: Record<ForbiddenTripStatus, string> = {
      [TripStatusEnum.CANCELLED]:
        'Trip has been cancelled and cannot be cancelled.',
      [TripStatusEnum.COMPLETED]:
        'Trip has already been completed and cannot be cancelled.',
    };

    if (forbiddenMessages[trip.status as ForbiddenTripStatus]) {
      throw new ForbiddenException(
        forbiddenMessages[trip.status as ForbiddenTripStatus],
      );
    }

    trip.status = TripStatusEnum.CANCELLED;
    await this.tripRepository.save(trip);
  };

  public updateTripRequestStatus = async (
    tripRequestId: string,
    updateTripRequestStatusRequest: UpdateTripRequestStatusRequest,
  ) => {
    return this.dataSource.transaction(async (manager) => {
      const tripRequestRepo = manager.getRepository(TripRequest);
      const tripRequest = await tripRequestRepo.findOne({
        where: {
          id: tripRequestId,
        },
        relations: {
          trip: true,
        },
      });

      if (!tripRequest)
        throw new RpcException({
          code: status.NOT_FOUND,
          message: 'Trip request not found.',
        });

      const { status: statusRequest } = updateTripRequestStatusRequest;

      tripRequest.status = tripRequestStatusMapping[statusRequest];
      await tripRequestRepo.save(tripRequest);

      if (statusRequest === TripRequestStatus.TRIP_REQUEST_STATUS_ACCEPTED) {
        await this.createNewOutboxEvent(
          {
            eventType: EventTypes.UPDATE_DRIVER_STATUS,
            payload: {
              driverId: tripRequest.trip.driverId,
              status: DriverStatusEnum.BUSY,
            },
            aggregateId: tripRequest.id,
            aggregateType: AggregateTypes.TRIP,
          },
          manager,
        );
      }
    });
  };

  public getTripsOfDriver = async (
    driverId: string,
    getTripsOfDriverQueryDto: GetTripsOfDriverQueryDto,
  ): Promise<GetTripsOfDriverResponse> => {
    const { afterCursor } = getTripsOfDriverQueryDto;
    const paginator = buildPaginator({
      entity: Trip,
      alias: 'trip',
      paginationKeys: ['createdAt'],
      query: {
        limit: 10,
        order: 'DESC',
        afterCursor,
      },
    });

    const qb = this.tripRepository
      .createQueryBuilder('trip')
      .andWhere('trip.driverId = :driverId', { driverId });

    const { data, cursor } = await paginator.paginate(qb);

    return {
      data,
      afterCursor: cursor?.afterCursor ?? null,
    };
  };

  private createTripRequest = async (
    createTripRequestDto: CreateTripRequestDto,
    trip: Trip,
  ) => {
    const newTripRequest =
      this.tripRequestRepository.create(createTripRequestDto);
    newTripRequest.trip = trip;
    return this.tripRequestRepository.save(newTripRequest);
  };

  private findTripById = async (tripId: string) => {
    const trip = await this.tripRepository.findOne({
      where: {
        id: tripId,
      },
    });

    if (!trip) throw new NotFoundException('Trip not found.');

    return trip;
  };

  private createNewOutboxEvent = async (
    createOutboxDto: CreateOutboxDto,
    manager: EntityManager,
  ) => {
    const outboxRepo = manager.getRepository(OutboxEvent);
    const newOutbox = outboxRepo.create(createOutboxDto);
    return outboxRepo.save(newOutbox);
  };

  async estimateFare(getEstimateRequest: GetEstimateRequest) {
    const { originAddress, destinationAddress } = getEstimateRequest;

    const estimateFare = await this.commonService.getEstimatedFare(
      originAddress,
      destinationAddress,
    );

    return {
      estimateFare: formatCurrencyVND(estimateFare),
    };
  }

  public async rateTrip(
    tripId: string,
    rateTripRequest: RateTripRequest,
    userSession: TGrpcUser,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const { sub } = userSession;
      const tripRepo = manager.getRepository(Trip);
      const tripRatingRepo = manager.getRepository(TripRating);
      const { rating, comment } = rateTripRequest;

      const trip = await tripRepo.findOne({
        where: { id: tripId },
        relations: ['rating'],
      });

      if (!trip) throw new NotFoundException('Trip not found.');
      if (trip.passengerId !== sub)
        throw new ForbiddenException('You are not the passenger of this trip.');
      if (trip.status !== TripStatusEnum.COMPLETED)
        throw new ForbiddenException('You can only rate a completed trip.');
      if (trip.rating)
        throw new ForbiddenException('Trip has already been rated.');

      const tripRating = tripRatingRepo.create({
        rating,
        comment,
        trip,
        reviewerId: sub,
      });
      await tripRatingRepo.save(tripRating);

      await this.createNewOutboxEvent(
        {
          eventType: EventTypes.UPDATE_RATE,
          payload: {
            updateDriverRateDto: {
              driverId: trip.driverId,
              rating,
              tripId: trip.id,
              reviewerId: sub,
              comment,
            },
          },
          aggregateId: tripId,
          aggregateType: AggregateTypes.TRIP,
        },
        manager,
      );

      return {
        success: true,
        message: 'Trip rated successfully.',
        data: {
          tripId: trip.id,
          driverId: trip.driverId,
          rating,
          comment,
        },
      };
    });
  }
}
