import { Trip, TripRequest } from '@/trip/src/entities';
import { TripRequestProducer } from '@/trip/src/producers';
import { status } from '@grpc/grpc-js';
import {
  AssignDriverDto,
  CommonService,
  generateNotificationContent,
  REDLOCK_RETRY_COUNT,
  REDLOCK_RETRY_DELAY,
  SERVICES,
} from '@libs/common';
import { PATTERNS } from '@libs/common/constants';
import {
  InjectPulsarService,
  InjectRabbitMqService,
  InjectRedisService,
} from '@libs/common/decorators';
import { CreateTripRequestDto } from '@libs/common/dto';
import { NotificationTypeEnum } from '@libs/common/enums/notification';
import { PulsarService } from '@libs/common/modules/pulsar/pulsar.service';
import { RabbitMQService } from '@libs/common/modules/rabbitmq/rabbitmq.service';
import { RedisService } from '@libs/common/modules/redis/redis.service';
import { FindAvailableDriversResponse } from '@libs/common/proto/driver';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { addSeconds } from 'date-fns';
import { ObjectType } from 'nestjs-dynamoose';
import CircuitBreaker from 'opossum';
import { Consumer } from 'pulsar-client';
import Redlock from 'redlock';
import { Repository } from 'typeorm';

@Injectable()
export class DriverAssignmentConsumer implements OnModuleInit {
  private readonly logger = new Logger(DriverAssignmentConsumer.name);
  private findDriversBreaker: CircuitBreaker<
    [payload: { lat: number; lng: number }],
    FindAvailableDriversResponse
  >;
  private redlock: Redlock;
  private consumer: Consumer;

  constructor(
    @InjectPulsarService()
    private readonly pulsarService: PulsarService,
    @InjectRedisService() private readonly redisService: RedisService,
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
    @InjectRabbitMqService() private readonly rabbitMqService: RabbitMQService,
    private readonly commonService: CommonService,
    @InjectRepository(TripRequest)
    private readonly tripRequestRepo: Repository<TripRequest>,
    private readonly tripRequestProducer: TripRequestProducer,
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

    this.redlock = new Redlock([this.redisService.getClient() as any], {
      retryCount: REDLOCK_RETRY_COUNT,
      retryDelay: REDLOCK_RETRY_DELAY,
    });
  }

  async onModuleInit() {
    this.consumer = await this.pulsarService.createConsumer(
      'trip-create',
      'trip-subscription',
      'Shared',
    );

    this.logger.log('🚀 DriverAssignmentConsumer started');
    this.start();
  }

  async start() {
    while (true) {
      const msg = await this.consumer.receive();
      try {
        const data: AssignDriverDto = JSON.parse(msg.getData().toString());
        await this.processTrip(data);
        await this.consumer.acknowledge(msg);
      } catch (err) {
        this.logger.error('Failed to process trip message', err);
        this.consumer.negativeAcknowledge(msg);
      }
    }
  }

  private async processTrip(data: AssignDriverDto) {
    const { passengerId, createTripDto } = data;
    const { destinationAddress, originAddress, note } = createTripDto;

    const originGeo = await this.commonService.getCoordinates(originAddress);
    const destinationGeo =
      await this.commonService.getCoordinates(destinationAddress);

    const availableDrivers = await this.findDriversBreaker.fire({
      lat: originGeo.lat,
      lng: originGeo.lon,
    });

    if (!availableDrivers.count) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'No available drivers found nearby.',
      });
    }

    const fareEstimate = await this.commonService.getEstimatedFare(
      originAddress,
      destinationAddress,
    );

    let tripCreated = false;

    for (const driver of availableDrivers.drivers) {
      let lock: Redlock.Lock | undefined;
      try {
        lock = await this.redlock.acquire(
          [`locks:driver:${driver.driverId}`],
          5000,
        );

        const newTrip = this.tripRepo.create({
          originAddress,
          destinationAddress,
          originLat: originGeo.lat,
          originLng: originGeo.lon,
          destinationLat: destinationGeo.lat,
          destinationLng: destinationGeo.lon,
          fareEstimate,
          fareFinal: fareEstimate,
          driverId: driver.driverId,
          passengerId,
          note,
        });
        await this.tripRepo.save(newTrip);

        const newTripRequest = await this.createTripRequest(
          {
            expiresTime: addSeconds(new Date(), 15),
            tripId: newTrip.id,
          },
          newTrip,
        );

        await this.tripRequestProducer.processTripRequest(
          { tripRequestId: newTripRequest.id, sub: passengerId },
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
          { driverId: driver.driverId },
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

        tripCreated = true;
        await lock.unlock();
        break;
      } catch (err) {
        if (lock) await lock.unlock().catch(() => {});
        this.logger.warn(
          `Driver ${driver.driverId} busy or error, trying next driver`,
        );
        continue;
      }
    }

    if (!tripCreated) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: 'No available drivers could be locked.',
      });
    }
  }

  private async createTripRequest(
    createTripRequestDto: CreateTripRequestDto,
    trip: Trip,
  ) {
    const newTripRequest = this.tripRequestRepo.create(createTripRequestDto);
    newTripRequest.trip = trip;
    return this.tripRequestRepo.save(newTripRequest);
  }
}
