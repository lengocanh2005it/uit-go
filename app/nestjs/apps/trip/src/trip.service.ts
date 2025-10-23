import { EstimateFareDto } from '@/trip/src/dto';
import { TripRequestProducer } from '@/trip/src/producers';
import { CommonService, ForbiddenTripStatus } from '@libs/common';
import { AggregateTypes, EventTypes, PATTERNS } from '@libs/common/constants';
import {
  InjectRabbitMqService,
  InjectRedisService,
} from '@libs/common/decorators';
import {
  CreateOutboxDto,
  CreateTripDto,
  CreateTripRequestDto,
  GetTripsOfDriverQueryDto,
  UpdateTripDto,
  UpdateTripRequestStatusDto,
  CreateTripRatingDto,
} from '@libs/common/dto';
import {
  DriverStatusEnum,
  TripRequestStatusEnum,
  TripStatusEnum,
} from '@libs/common/enums';
import { RabbitMQService } from '@libs/common/modules/rabbitmq/rabbitmq.service';
import {
  FindAvailableDriversResponse,
  formatCurrencyVND,
  GetTripsOfDriverResponse,
  SERVICES,
  TUserSession,
} from '@libs/common/utils';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { buildPaginator } from 'typeorm-cursor-pagination';
import { OutboxEvent, Trip, TripRating, TripRequest } from './entities';

@Injectable()
export class TripService {
  constructor(
    @InjectRepository(Trip) private readonly tripRepository: Repository<Trip>,
    @InjectRepository(TripRequest)
    private readonly tripRequestRepository: Repository<TripRequest>,
    @InjectRepository(TripRating)
    private readonly tripRatingRepository: Repository<TripRating>,
    @InjectRabbitMqService() private readonly rabbitMqService: RabbitMQService,
    private readonly tripRequestProducer: TripRequestProducer,
    private readonly commonService: CommonService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  public getTrip = async (tripId: string) => {
    return this.findTripById(tripId);
  };

  public createTrip = async (
    createTripDto: CreateTripDto,
    userSession: TUserSession,
  ) => {
    const { sub } = userSession;
    const { destinationAddress, originAddress } = createTripDto;

    const originAddressGeoCode =
      await this.commonService.getCoordinates(originAddress);

    const destinationAddressGeoCode =
      await this.commonService.getCoordinates(destinationAddress);

    const availableDrivers =
      await this.rabbitMqService.send<FindAvailableDriversResponse>(
        SERVICES.DRIVER_SERVICE,
        PATTERNS.DRIVER_SERVICE.FIND_AVAILABLE,
        {
          lat: originAddressGeoCode?.lat ?? 0,
          lng: originAddressGeoCode?.lon ?? 0,
        },
      );

    if (availableDrivers.count === 0) {
      throw new NotFoundException('No available drivers found nearby.');
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

  public updateTrip = async (tripId: string, updateTripDto: UpdateTripDto) => {
    return this.dataSource.transaction(async (manager) => {
      const tripRepo = manager.getRepository(Trip);
      const trip = await tripRepo.findOne({
        where: {
          id: tripId,
        },
      });

      if (!trip) throw new NotFoundException('Trip not found.');

      const { destinationAddress, status, note, fareFinal } = updateTripDto;

      if (
        trip.status === TripStatusEnum.CANCELLED ||
        trip.status === TripStatusEnum.COMPLETED
      )
        throw new ForbiddenException(
          `Trip has been ${trip.status === TripStatusEnum.CANCELLED ? 'cancelled' : 'completed'} and cannot be modified.`,
        );

      if (trip.status === TripStatusEnum.ONGOING && destinationAddress) {
        throw new ForbiddenException(
          'Destination address cannot be changed while the trip is ongoing.',
        );
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

      trip.status = status || trip.status;
      trip.note = note || trip.note;
      trip.destinationAddress = destinationAddress || trip.destinationAddress;
      if (!destinationAddress) trip.fareFinal = fareFinal || trip.fareFinal;

      await this.tripRepository.save(trip);

      if (status === TripStatusEnum.COMPLETED) {
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
    updateTripRequestStatusDto: UpdateTripRequestStatusDto,
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

      if (!tripRequest) throw new NotFoundException('Trip request not found.');

      const { status } = updateTripRequestStatusDto;
      tripRequest.status = status;
      await tripRequestRepo.save(tripRequest);
      if (status === TripRequestStatusEnum.ACCEPTED) {
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

  async estimateFare(estimateFareDto: EstimateFareDto) {
    const { originAddress, destinationAddress } = estimateFareDto;
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
    createTripRatingDto: CreateTripRatingDto,
    userSession: TUserSession,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const { sub } = userSession;
      const tripRepo = manager.getRepository(Trip);
      const tripRatingRepo = manager.getRepository(TripRating);
      const { rating, comment } = createTripRatingDto;

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
