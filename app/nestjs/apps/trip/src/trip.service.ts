import { GetEstimateDto, RateTripDto } from '@/trip/src/dto';
import {
  DriverAssignmentProducer,
  TripStatusProducer,
} from '@/trip/src/producers';
import { UserRole } from '@/user/src/enums';
import { status } from '@grpc/grpc-js';
import { CommonService, ForbiddenTripStatus } from '@libs/common';
import { AggregateTypes, EventTypes, PATTERNS } from '@libs/common/constants';
import { InjectRabbitMqService } from '@libs/common/decorators';
import {
  CreateOutboxDto,
  CreateTripDto,
  GetAllTripsOfDriverDto,
  UpdateTripDto,
  UpdateTripRequestStatusDto,
} from '@libs/common/dto';
import {
  DriverStatusEnum,
  TripRequestStatusEnum,
  TripStatusEnum,
} from '@libs/common/enums';
import { NotificationTypeEnum } from '@libs/common/enums/notification';
import { RabbitMQService } from '@libs/common/modules/rabbitmq/rabbitmq.service';
import { GetAllTripsOfDriverResponse } from '@libs/common/proto/driver';
import {
  CreateTripResponse,
  GetEstimateResponse,
  GetTripResponse,
  RateTripResponse,
  UpdateTripRequestStatusResponse,
} from '@libs/common/proto/trip';
import {
  formatCurrencyVND,
  generateNotificationContent,
  NotificationParams,
  SERVICES,
  TGrpcUser,
} from '@libs/common/utils';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { ObjectType } from 'nestjs-dynamoose';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { buildPaginator } from 'typeorm-cursor-pagination';
import { OutboxEvent, Trip, TripRating, TripRequest } from './entities';

@Injectable()
export class TripService {
  constructor(
    @InjectRepository(Trip) private readonly tripRepository: Repository<Trip>,
    @InjectRabbitMqService() private readonly rabbitMqService: RabbitMQService,
    private readonly commonService: CommonService,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly tripStatusProducer: TripStatusProducer,
    private readonly driverAssignmentProducer: DriverAssignmentProducer,
  ) {}

  public getTrip = async (tripId: string): Promise<GetTripResponse> => {
    return this.findTripById(tripId);
  };

  public createTrip = async (
    createTripDto: CreateTripDto,
    userSession: TGrpcUser,
  ): Promise<CreateTripResponse> => {
    const { sub } = userSession;

    await this.driverAssignmentProducer.assignDriver({
      passengerId: sub,
      createTripDto,
    });

    return {
      message:
        'Your trip request is being processed. You will receive a notification as soon as there is an update.',
    };
  };

  public updateTrip = async (
    updateTripDto: UpdateTripDto,
    grpcUser: TGrpcUser,
  ) => {
    return this.dataSource.transaction(async (manager) => {
      const { tripId } = updateTripDto;

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

      trip.status = statusDto || trip.status;
      trip.note = note || trip.note;
      trip.destinationAddress = destinationAddress || trip.destinationAddress;
      if (!destinationAddress) trip.fareFinal = fareFinal || trip.fareFinal;

      await this.tripRepository.save(trip);

      if (statusDto === TripStatusEnum.COMPLETED) {
        const { message, title } = generateNotificationContent(
          NotificationTypeEnum.TRIP_COMPLETED,
          {
            pickupLocation: trip.originAddress,
            dropoffLocation: trip.destinationAddress,
          },
        );

        this.rabbitMqService.emit(
          SERVICES.NOTIFICATION_SERVICE,
          PATTERNS.NOTIFICATION_SERVICE.CREATE_NOTIFICATION,
          {
            userId: trip.passengerId,
            createNotificationDto: {
              type: NotificationTypeEnum.TRIP_COMPLETED,
              message,
              title,
            },
            data: {
              tripId: trip.id,
            },
          },
        );

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
      } else if (statusDto === TripStatusEnum.STARTED) {
        const { message, title } = generateNotificationContent(
          NotificationTypeEnum.TRIP_STARTED,
          {
            pickupLocation: trip.originAddress,
            dropoffLocation: trip.destinationAddress,
          },
        );

        this.rabbitMqService.emit(
          SERVICES.NOTIFICATION_SERVICE,
          PATTERNS.NOTIFICATION_SERVICE.CREATE_NOTIFICATION,
          {
            userId: trip.passengerId,
            createNotificationDto: {
              type: NotificationTypeEnum.TRIP_STARTED,
              message,
              title,
            },
            data: {
              tripId: trip.id,
            },
          },
        );

        this.tripStatusProducer.updateTripStatus(
          {
            tripId,
            sub: grpcUser.sub,
            status: TripStatusEnum.ONGOING,
          },
          2000,
        );
      }

      return this.getTrip(trip.id);
    });
  };

  public cancelTrip = async (tripId: string, grpcUser: TGrpcUser) => {
    const { role, sub } = grpcUser;
    const trip = await this.findTripById(tripId);

    const forbiddenMessages: Record<ForbiddenTripStatus, string> = {
      [TripStatusEnum.CANCELLED]:
        'Trip has been cancelled and cannot be cancelled.',
      [TripStatusEnum.COMPLETED]:
        'Trip has already been completed and cannot be cancelled.',
    };

    if (forbiddenMessages[trip.status as ForbiddenTripStatus]) {
      throw new RpcException({
        code: status.PERMISSION_DENIED,
        message: forbiddenMessages[trip.status as ForbiddenTripStatus],
      });
    }

    trip.status = TripStatusEnum.CANCELLED;
    await this.tripRepository.save(trip);

    const isCustomer = role === UserRole.CUSTOMER;
    const userInfo: ObjectType = await this.rabbitMqService.send(
      SERVICES.USER_SERVICE,
      PATTERNS.USER_SERVICE.GET_PROFILE_BY_USER_ID,
      {
        userId: sub,
      },
    );
    let driverInfo: ObjectType = {};

    const typeNotif = isCustomer
      ? NotificationTypeEnum.TRIP_CANCELED_BY_USER
      : NotificationTypeEnum.TRIP_CANCELED_BY_DRIVER;

    const params: NotificationParams = isCustomer
      ? {
          userName: userInfo.profile.fullName ?? '',
        }
      : {
          driverName: userInfo.profile.fullName ?? '',
        };

    const { message, title } = generateNotificationContent(typeNotif, params);

    if (!isCustomer) {
      driverInfo = await this.rabbitMqService.send<ObjectType>(
        SERVICES.DRIVER_SERVICE,
        PATTERNS.DRIVER_SERVICE.GET_BY_ID,
        {
          driverId: trip.driverId,
        },
      );
    }

    this.rabbitMqService.emit(
      SERVICES.NOTIFICATION_SERVICE,
      PATTERNS.NOTIFICATION_SERVICE.CREATE_NOTIFICATION,
      {
        userId: isCustomer
          ? (driverInfo.userId ?? trip.driverId)
          : trip.passengerId,
        createNotificationDto: {
          type: typeNotif,
          message,
          title,
        },
      },
    );
  };

  public updateTripRequestStatus = async (
    updateTripRequestStatusDto: UpdateTripRequestStatusDto,
    grpcUser: TGrpcUser,
  ): Promise<UpdateTripRequestStatusResponse> => {
    return this.dataSource.transaction(async (manager) => {
      const { sub } = grpcUser;
      const { status: statusRequest, tripRequestId } =
        updateTripRequestStatusDto;

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

      tripRequest.status = statusRequest;
      await tripRequestRepo.save(tripRequest);

      if (
        statusRequest === TripRequestStatusEnum.ACCEPTED ||
        statusRequest === TripRequestStatusEnum.REJECTED
      ) {
        const userInfo = await this.rabbitMqService.send<ObjectType>(
          SERVICES.USER_SERVICE,
          PATTERNS.USER_SERVICE.GET_PROFILE_BY_USER_ID,
          {
            userId: sub,
          },
        );

        const isAccepted = statusRequest === TripRequestStatusEnum.ACCEPTED;

        const typeNotif = isAccepted
          ? NotificationTypeEnum.TRIP_ACCEPTED
          : NotificationTypeEnum.TRIP_CANCELED_BY_DRIVER;
        const params: NotificationParams = {
          driverName: userInfo.profile.fullName ?? '',
        };

        const { message, title } = generateNotificationContent(
          typeNotif,
          params,
        );

        this.rabbitMqService.emit(
          SERVICES.NOTIFICATION_SERVICE,
          PATTERNS.NOTIFICATION_SERVICE.CREATE_NOTIFICATION,
          {
            userId: tripRequest.trip.passengerId,
            createNotificationDto: {
              type: typeNotif,
              message,
              title,
            },
            data: {
              tripId: tripRequest.trip.id,
              driverId: tripRequest.trip.driverId,
              passengerId: tripRequest.trip.passengerId,
            },
          },
        );
      }

      if (statusRequest === TripRequestStatusEnum.ACCEPTED) {
        await this.createNewOutboxEvent(
          {
            eventType: EventTypes.UPDATE_DRIVER_STATUS,
            payload: {
              driverId: tripRequest.trip.driverId,
              status: DriverStatusEnum.BUSY,
              currentTripId: tripRequest.trip.id,
            },
            aggregateId: tripRequest.id,
            aggregateType: AggregateTypes.TRIP,
          },
          manager,
        );

        await this.tripStatusProducer.updateTripStatus(
          {
            tripId: tripRequest.trip.id,
            sub,
            status: TripStatusEnum.ARRIVING,
          },
          3000,
        );
      }

      return {
        message: 'Trip request status updated successfully.',
      };
    });
  };

  public getTripsOfDriver = async (
    getAllTripsOfDriverDto: GetAllTripsOfDriverDto,
    driverId: string,
  ): Promise<GetAllTripsOfDriverResponse> => {
    const { afterCursor } = getAllTripsOfDriverDto;

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
      afterCursor: cursor?.afterCursor ?? undefined,
    };
  };

  private findTripById = async (tripId: string) => {
    const trip = await this.tripRepository.findOne({
      where: {
        id: tripId,
      },
    });

    if (!trip)
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'Trip not found.',
      });

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

  async estimateFare(
    getEstimateDto: GetEstimateDto,
  ): Promise<GetEstimateResponse> {
    const { originAddress, destinationAddress } = getEstimateDto;

    const estimateFare = await this.commonService.getEstimatedFare(
      originAddress,
      destinationAddress,
    );

    return {
      estimateFare: formatCurrencyVND(estimateFare),
    };
  }

  public async rateTrip(
    rateTripDto: RateTripDto,
    userSession: TGrpcUser,
  ): Promise<RateTripResponse> {
    return this.dataSource.transaction(async (manager) => {
      const { sub } = userSession;
      const tripRepo = manager.getRepository(Trip);
      const tripRatingRepo = manager.getRepository(TripRating);
      const { rating, comment, tripId } = rateTripDto;

      const trip = await tripRepo.findOne({
        where: { id: tripId },
        relations: {
          rating: true,
        },
      });

      if (!trip)
        throw new RpcException({
          code: status.NOT_FOUND,
          message: 'Trip not found.',
        });

      if (trip.passengerId !== sub)
        throw new RpcException({
          code: status.PERMISSION_DENIED,
          message: 'You are not the passenger of this trip.',
        });

      if (trip.status !== TripStatusEnum.COMPLETED)
        throw new RpcException({
          code: status.PERMISSION_DENIED,
          message: 'You can only rate a completed trip.',
        });

      if (trip.rating)
        throw new RpcException({
          code: status.PERMISSION_DENIED,
          message: `Trip has already been rated.`,
        });

      const tripRating = tripRatingRepo.create({
        rating,
        comment,
        trip,
        reviewerId: sub,
        createdAt: new Date(),
      });

      await tripRatingRepo.save(tripRating);

      const outboxEvent = await this.createNewOutboxEvent(
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

      const { message, title } = generateNotificationContent(
        NotificationTypeEnum.TRIP_RATED,
        {
          rating,
          comment,
        },
      );

      const driverInfo = await this.rabbitMqService.send<ObjectType>(
        SERVICES.DRIVER_SERVICE,
        PATTERNS.DRIVER_SERVICE.GET_BY_ID,
        {
          driverId: trip.driverId,
        },
      );

      this.rabbitMqService.emit(
        SERVICES.DRIVER_SERVICE,
        PATTERNS.DRIVER_SERVICE.UPDATE_RATE,
        {
          updateDriverRateDto: {
            driverId: driverInfo.driverId,
            rating,
            tripId,
            reviewerId: sub,
            ...(comment?.trim() && { comment }),
          },
          eventId: outboxEvent.id,
        },
      );

      this.rabbitMqService.emit(
        SERVICES.NOTIFICATION_SERVICE,
        PATTERNS.NOTIFICATION_SERVICE.CREATE_NOTIFICATION,
        {
          userId: driverInfo.userId,
          createNotificationDto: {
            type: NotificationTypeEnum.TRIP_RATED,
            message,
            title,
          },
          data: {
            tripId: trip.id,
            rating,
            ...(comment?.trim() && { comment }),
          },
        },
      );

      return {
        success: true,
        message: 'Trip rated successfully.',
        data: {
          tripId: trip.id,
          driverId: trip.driverId,
          rating,
          ...(comment && { comment }),
        },
      };
    });
  }
}
