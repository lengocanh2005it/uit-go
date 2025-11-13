import { QueueNamesOfTripService } from '@/trip/src/constants';
import { Trip, TripRequest } from '@/trip/src/entities';
import { TripRequestProducer } from '@/trip/src/producers';
import { status } from '@grpc/grpc-js';
import {
  AssignDriverDto,
  CommonService,
  FindAvailableDriversResponse,
  generateNotificationContent,
  SERVICES,
} from '@libs/common';
import { PATTERNS } from '@libs/common/constants';
import { InjectRabbitMqService } from '@libs/common/decorators';
import { CreateTripRequestDto } from '@libs/common/dto';
import { NotificationTypeEnum } from '@libs/common/enums/notification';
import { RabbitMQService } from '@libs/common/modules/rabbitmq/rabbitmq.service';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { addSeconds } from 'date-fns';
import { ObjectType } from 'nestjs-dynamoose';
import CircuitBreaker from 'opossum';
import { Repository } from 'typeorm';

@Processor(QueueNamesOfTripService.driverAssigment)
export class DriverAssignmentProcessor extends WorkerHost {
  private findDriversBreaker: CircuitBreaker<
    [payload: { lat: number; lng: number }],
    FindAvailableDriversResponse
  >;

  constructor(
    @InjectRabbitMqService() private readonly rabbitMqService: RabbitMQService,
    private readonly commonService: CommonService,
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
    @InjectRepository(TripRequest)
    private readonly tripRequestRepo: Repository<TripRequest>,
    private readonly tripRequestProducer: TripRequestProducer,
  ) {
    super();

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

  async process(job: Job<AssignDriverDto>) {
    const { passengerId, createTripDto } = job.data;
    const { destinationAddress, originAddress, note } = createTripDto;

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

    const newTrip = this.tripRepo.create({
      originAddress,
      destinationAddress,
      originLat: originAddressGeoCode?.lat ?? 0,
      originLng: originAddressGeoCode?.lon ?? 0,
      destinationLat: destinationAddressGeoCode?.lat ?? 0,
      destinationLng: destinationAddressGeoCode?.lon ?? 0,
      fareEstimate,
      fareFinal: fareEstimate,
      driverId: driver.driverId,
      passengerId,
      note,
    });

    await this.tripRepo.save(newTrip);

    const newTripRequesst = await this.createTripRequest(
      {
        expiresTime: addSeconds(new Date(), 15),
        tripId: newTrip.id,
      },
      newTrip,
    );

    await this.tripRequestProducer.processTripRequest(
      {
        tripRequestId: newTripRequesst.id,
        sub: passengerId,
      },
      15000,
    );

    const { message, title } = generateNotificationContent(
      NotificationTypeEnum.TRIP_REQUESTED,
      {
        pickupLocation: originAddress,
        dropoffLocation: destinationAddress,
      },
    );

    const driverInfo = await this.rabbitMqService.send<ObjectType>(
      SERVICES.DRIVER_SERVICE,
      PATTERNS.DRIVER_SERVICE.GET_BY_ID,
      {
        driverId: driver.driverId,
      },
    );

    this.rabbitMqService.emit(
      SERVICES.NOTIFICATION_SERVICE,
      PATTERNS.NOTIFICATION_SERVICE.CREATE_NOTIFICATION,
      {
        userId: driverInfo.userId,
        createNotificationDto: {
          type: NotificationTypeEnum.TRIP_REQUESTED,
          message,
          title,
        },
        data: {
          tripId: newTrip.id,
          passengerId,
          driverId: driver.driverId,
        },
      },
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    console.log(`Job '${job.name}' completed.`);
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<AssignDriverDto>, err: Error) {
    console.log(`Job '${job.name}' failed due to: `, err);

    if (job.attemptsMade >= (job.opts.attempts ?? 1)) {
      console.log(`Job '${job.name}' failed after all retries.`);

      const { passengerId } = job.data;

      this.rabbitMqService.emit(
        SERVICES.NOTIFICATION_SERVICE,
        PATTERNS.NOTIFICATION_SERVICE.CREATE_NOTIFICATION,
        {
          userId: passengerId,
          createNotificationDto: {
            type: NotificationTypeEnum.TRIP_REQUEST_FAILED,
            message:
              "We couldn't find a driver for your trip right now. Please try again in a few minutes.",
            title: 'No Drivers Available',
          },
        },
      );
    }
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    if (job.attemptsMade > 0) {
      console.error(
        `Retrying job '${job.name}', attempt: ${job.attemptsMade + 1}`,
      );
    }
  }

  private createTripRequest = async (
    createTripRequestDto: CreateTripRequestDto,
    trip: Trip,
  ) => {
    const newTripRequest = this.tripRequestRepo.create(createTripRequestDto);
    newTripRequest.trip = trip;
    return this.tripRequestRepo.save(newTripRequest);
  };
}
