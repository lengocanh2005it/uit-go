import { Trip, TripRequest } from '@/trip/src/entities';
import {
  generateNotificationContent,
  ProcessTripRequestDto,
  SERVICES,
} from '@libs/common';
import { PATTERNS } from '@libs/common/constants';
import { InjectRabbitMqService } from '@libs/common/decorators';
import { TripRequestStatusEnum, TripStatusEnum } from '@libs/common/enums';
import { NotificationTypeEnum } from '@libs/common/enums/notification';
import { RabbitMQService } from '@libs/common/modules/rabbitmq/rabbitmq.service';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueueNamesOfTripService } from '@trip-service/constants';
import { Job } from 'bullmq';
import { ObjectType } from 'nestjs-dynamoose';
import { Repository } from 'typeorm';

@Processor(QueueNamesOfTripService.tripRequest)
export class TripRequestProcessor extends WorkerHost {
  private readonly logger = new Logger(TripRequestProcessor.name);
  constructor(
    @InjectRepository(TripRequest)
    private readonly tripRequestRepository: Repository<TripRequest>,
    @InjectRepository(Trip) private readonly tripRepository: Repository<Trip>,
    @InjectRabbitMqService() private readonly rabbitMqService: RabbitMQService,
  ) {
    super();
  }

  async process(job: Job<ProcessTripRequestDto>) {
    const { tripRequestId, sub } = job.data;
    const tripRequest = await this.tripRequestRepository.findOne({
      where: {
        id: tripRequestId,
      },
      relations: {
        trip: true,
      },
    });

    if (!tripRequest) {
      this.logger.warn(`Trip request ${tripRequestId} not found.`);
      return;
    }

    if (tripRequest.status === TripRequestStatusEnum.PENDING) {
      const userInfo = await this.rabbitMqService.send<ObjectType>(
        SERVICES.USER_SERVICE,
        PATTERNS.USER_SERVICE.GET_PROFILE_BY_USER_ID,
        {
          userId: sub,
        },
      );
      const passengerInfo = await this.rabbitMqService.send<ObjectType>(
        SERVICES.USER_SERVICE,
        PATTERNS.USER_SERVICE.GET_PROFILE_BY_USER_ID,
        {
          userId: tripRequest.trip.passengerId,
        },
      );

      const { message, title } = generateNotificationContent(
        NotificationTypeEnum.DRIVER_REQUEST_TIMEOUT,
        {
          userName: passengerInfo.profile.fullName ?? '',
        },
      );

      tripRequest.status = TripRequestStatusEnum.TIMEOUT;
      await this.tripRequestRepository.save(tripRequest);
      await this.tripRepository.update(
        { id: tripRequest.trip.id },
        { status: TripStatusEnum.CANCELLED },
      );

      this.rabbitMqService.emit(
        SERVICES.NOTIFICATION_SERVICE,
        PATTERNS.NOTIFICATION_SERVICE.CREATE_NOTIFICATION,
        {
          userId: sub,
          createNotificationDto: {
            type: NotificationTypeEnum.DRIVER_REQUEST_TIMEOUT,
            message,
            title,
          },
          data: {
            tripId: tripRequest.trip.id,
          },
        },
      );

      const content = generateNotificationContent(
        NotificationTypeEnum.TRIP_CANCELED_BY_DRIVER,
        {
          driverName: userInfo.profile.fullName ?? '',
        },
      );

      this.rabbitMqService.emit(
        SERVICES.NOTIFICATION_SERVICE,
        PATTERNS.NOTIFICATION_SERVICE.CREATE_NOTIFICATION,
        {
          userId: tripRequest.trip.passengerId,
          createNotificationDto: {
            type: NotificationTypeEnum.TRIP_CANCELED_BY_DRIVER,
            message: content.message,
            title: content.title,
          },
          data: {
            tripId: tripRequest.trip.id,
          },
        },
      );
    }
    this.logger.log(`Trip request ${tripRequestId} processed successfully.`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    console.log(`Job '${job.name}' completed.`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    console.log(`Job '${job.name} failed due to: `, err);
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    if (job.attemptsMade > 0) {
      console.error(
        `Retrying job '${job.name}', attempt: ${job.attemptsMade + 1}`,
      );
    }
  }
}
