import { Trip, TripRequest } from '@/trip/src/entities';
import { TripRequestProducer } from '@/trip/src/producers';
import { status } from '@grpc/grpc-js';
import {
  AssignDriverDto,
  CommonService,
  generateNotificationContent,
  PULSAR_MAX_REDELIVER_COUNT,
  PULSAR_REDELIVER_TIMEOUT,
  SERVICES,
} from '@libs/common';
import { PATTERNS } from '@libs/common/constants';
import {
  InjectPulsarService,
  InjectRabbitMqService,
} from '@libs/common/decorators';
import { CreateTripRequestDto } from '@libs/common/dto';
import { NotificationTypeEnum } from '@libs/common/enums/notification';
import { PulsarService } from '@libs/common/modules/pulsar/pulsar.service';
import { RabbitMQService } from '@libs/common/modules/rabbitmq/rabbitmq.service';
import { FindAvailableDriversResponse } from '@libs/common/proto/driver';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { addSeconds } from 'date-fns';
import { ObjectType } from 'nestjs-dynamoose';
import { RedlockService } from 'nestjs-redlock-universal';
import CircuitBreaker from 'opossum';
import { Consumer, Message } from 'pulsar-client';
import { Repository } from 'typeorm';

@Injectable()
export class DriverAssignmentConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DriverAssignmentConsumer.name);
  private consumer: Consumer | null = null;
  private running = false;
  private readonly breaker: CircuitBreaker<
    [payload: { lat: number; lng: number }],
    FindAvailableDriversResponse
  >;

  constructor(
    @InjectPulsarService() private readonly pulsarService: PulsarService,
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
    @InjectRepository(TripRequest)
    private readonly tripRequestRepo: Repository<TripRequest>,
    @InjectRabbitMqService() private readonly rabbitMqService: RabbitMQService,
    private readonly commonService: CommonService,
    private readonly tripRequestProducer: TripRequestProducer,
    private readonly redlockService: RedlockService,
  ) {
    this.breaker = new CircuitBreaker(
      (payload: { lat: number; lng: number }) =>
        this.rabbitMqService.send(
          SERVICES.DRIVER_SERVICE,
          PATTERNS.DRIVER_SERVICE.FIND_AVAILABLE,
          payload,
        ),
      { errorThresholdPercentage: 50, resetTimeout: 10000 },
    );

    this.breaker.fallback(() => ({ count: 0, drivers: [] }));
  }

  async onModuleInit() {
    this.logger.log('Initializing DriverAssignmentConsumer...');
    try {
      this.consumer = await this.pulsarService.createConsumer(
        'trip-create',
        'trip-subscription',
        'Shared',
        {
          deadLetterPolicy: {
            maxRedeliverCount: PULSAR_MAX_REDELIVER_COUNT,
            deadLetterTopic: 'trip-create-dlq',
          },
          nAckRedeliverTimeoutMs: PULSAR_REDELIVER_TIMEOUT,
        },
      );

      this.running = true;
      this.logger.log('🚀 DriverAssignmentConsumer started');
      this.startLoop().catch((err) => {
        this.logger.error('Fatal error in consumer loop', err);
      });
    } catch (err) {
      this.logger.error('Failed to create pulsar consumer during init', err);
      throw err;
    }
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down DriverAssignmentConsumer...');
    this.running = false;
    try {
      if (this.consumer) {
        await this.consumer.close();
        this.consumer = null;
      }
    } catch (err) {
      this.logger.warn('Error while closing consumer', err);
    }
  }

  private async startLoop() {
    let backoffMs = 100;
    const maxBackoff = 5000;

    while (this.running) {
      if (!this.consumer) {
        this.logger.warn('Consumer not available, attempting recreate...');
        try {
          this.consumer = await this.pulsarService.createConsumer(
            'trip-create',
            'trip-subscription',
            'Shared',
            {
              deadLetterPolicy: {
                maxRedeliverCount: PULSAR_MAX_REDELIVER_COUNT,
                deadLetterTopic: 'trip-create-dlq',
              },
              nAckRedeliverTimeoutMs: PULSAR_REDELIVER_TIMEOUT,
            },
          );
          this.logger.log('Recreated Pulsar consumer successfully');
        } catch (err) {
          this.logger.error('Failed to recreate consumer, will retry', err);
          await this.sleep(Math.min(backoffMs, maxBackoff));
          backoffMs = Math.min(backoffMs * 2, maxBackoff);
          continue;
        }
      }

      try {
        const msg: Message = await this.consumer.receive();
        backoffMs = 100;

        try {
          const raw = msg.getData().toString();
          let data: AssignDriverDto;
          try {
            data = JSON.parse(raw);
          } catch (parseErr) {
            this.logger.error(
              'Invalid message payload, sending to DLQ via negativeAcknowledge',
              parseErr,
            );
            await this.safeNegativeAcknowledge(msg);
            continue;
          }

          await this.processTrip(data);
          await this.safeAcknowledge(msg);
        } catch (processingErr) {
          this.logger.error('Failed to process trip message', processingErr);
          await this.safeNegativeAcknowledge(msg);
        }
      } catch (receiveErr) {
        this.logger.error('Error receiving message from Pulsar', receiveErr);
        try {
          if (this.consumer) {
            await this.consumer.close().catch(() => {});
          }
        } catch {
        } finally {
          this.consumer = null;
        }
        await this.sleep(Math.min(backoffMs, maxBackoff));
        backoffMs = Math.min(backoffMs * 2, maxBackoff);
      }
    }
  }

  private async safeAcknowledge(msg: Message) {
    try {
      if (this.consumer) await this.consumer.acknowledge(msg);
    } catch (err) {
      this.logger.warn('Failed to acknowledge message', err);
    }
  }

  private async safeNegativeAcknowledge(msg: Message) {
    try {
      if (this.consumer) this.consumer.negativeAcknowledge(msg);
    } catch (err) {
      this.logger.warn('Failed to negativeAcknowledge message', err);
    }
  }

  private sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
  }

  private async processTrip(data: AssignDriverDto) {
    const { passengerId, createTripDto } = data;
    const { destinationAddress, originAddress, note } = createTripDto;

    const originGeo = await this.commonService.getCoordinates(originAddress);
    const destinationGeo =
      await this.commonService.getCoordinates(destinationAddress);

    const availableDrivers = await this.breaker.fire({
      lat: originGeo.lat,
      lng: originGeo.lon,
    });

    if (!availableDrivers?.count) {
      throw new RpcException({
        code: status.NOT_FOUND,
        message: `No available drivers for passenger ${passengerId}`,
      });
    }

    const fareEstimate = await this.commonService.getEstimatedFare(
      originAddress,
      destinationAddress,
    );

    let tripCreated = false;

    for (const driver of availableDrivers.drivers) {
      try {
        await this.redlockService.using(
          `locks:driver:${driver.driverId}`,
          async (signal) => {
            if (signal?.aborted) {
              throw new RpcException({
                code: status.ABORTED,
                message: 'Driver is currently busy, please try again later.',
              });
            }

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
                  tripRequestId: newTripRequest.id,
                  passengerId,
                  driverId: driver.driverId,
                  note,
                },
              },
            );

            await this.tripRepo.save(newTrip);

            await this.tripRequestProducer.processTripRequest(
              { tripRequestId: newTripRequest.id, sub: driverInfo.userId },
              15000,
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
                  tripRequestId: newTripRequest.id,
                  passengerId,
                  driverId: driver.driverId,
                },
              },
            );

            tripCreated = true;
          },
          {
            ttl: 50000,
          },
        );

        if (tripCreated) break;
      } catch (err) {
        this.logger.warn(
          `Driver ${driver.driverId} busy or error, trying next driver. cause: ${err?.message ?? err}`,
        );
        continue;
      }
    }

    if (!tripCreated) {
      throw new RpcException({
        code: status.INTERNAL,
        message: `No available drivers could be locked for passenger ${passengerId}`,
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
