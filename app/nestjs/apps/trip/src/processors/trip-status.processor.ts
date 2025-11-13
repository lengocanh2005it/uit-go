import { QueueNamesOfTripService } from '@/trip/src/constants';
import { Trip } from '@/trip/src/entities';
import {
  generateNotificationContent,
  SERVICES,
  UpdateTripStatusDto,
} from '@libs/common';
import { PATTERNS } from '@libs/common/constants';
import { InjectRabbitMqService } from '@libs/common/decorators';
import { TripStatusEnum } from '@libs/common/enums';
import { NotificationTypeEnum } from '@libs/common/enums/notification';
import { RabbitMQService } from '@libs/common/modules/rabbitmq/rabbitmq.service';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { ObjectType } from 'nestjs-dynamoose';
import { Repository } from 'typeorm';

@Processor(QueueNamesOfTripService.tripStatus)
export class TripStatusProcessor extends WorkerHost {
  private readonly logger = new Logger(TripStatusProcessor.name);

  constructor(
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
    @InjectRabbitMqService() private readonly rabbitMqService: RabbitMQService,
  ) {
    super();
  }

  async process(job: Job<UpdateTripStatusDto>) {
    const { tripId, sub, status } = job.data;

    const trip = await this.tripRepo.findOne({
      where: {
        id: tripId,
      },
    });

    if (trip) {
      const userInfo = await this.rabbitMqService.send<ObjectType>(
        SERVICES.NOTIFICATION_SERVICE,
        PATTERNS.NOTIFICATION_SERVICE.CREATE_NOTIFICATION,
        {
          userId: sub,
        },
      );

      trip.status = status;
      await this.tripRepo.save(trip);

      if (status === TripStatusEnum.ARRIVING) {
        const { message, title } = generateNotificationContent(
          NotificationTypeEnum.TRIP_ARRIVING,
          {
            driverName: userInfo.profile.fullName ?? '',
            pickupLocation: trip.originAddress,
          },
        );

        this.rabbitMqService.emit(
          SERVICES.NOTIFICATION_SERVICE,
          PATTERNS.NOTIFICATION_SERVICE.CREATE_NOTIFICATION,
          {
            userId: trip.passengerId,
            createNotificationDto: {
              type: NotificationTypeEnum.TRIP_ARRIVING,
              message,
              title,
            },
            data: {
              tripId,
            },
          },
        );
      }
    }

    this.logger.log(`Trip ${tripId}'s status processed successfully.`);
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
