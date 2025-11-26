import { SERVICES } from '@libs/common';
import { PATTERNS } from '@libs/common/constants';
import {
  InjectPulsarService,
  InjectRabbitMqService,
} from '@libs/common/decorators';
import { NotificationTypeEnum } from '@libs/common/enums/notification';
import { PulsarService } from '@libs/common/modules/pulsar/pulsar.service';
import { RabbitMQService } from '@libs/common/modules/rabbitmq/rabbitmq.service';
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Consumer } from 'pulsar-client';

@Injectable()
export class DriverAssignmentDLQConsumer implements OnModuleInit {
  private readonly logger = new Logger(DriverAssignmentDLQConsumer.name);
  private consumer: Consumer;

  constructor(
    @InjectPulsarService() private readonly pulsarService: PulsarService,
    @InjectRabbitMqService() private readonly rabbitMqService: RabbitMQService,
  ) {}

  async onModuleInit() {
    this.consumer = await this.pulsarService.createConsumer(
      'trip-create-dlq',
      'trip-dlq-subscription',
      'Shared',
    );

    this.logger.log('🚀 DriverAssignmentDLQConsumer started');
    this.start();
  }

  async start() {
    while (true) {
      const msg = await this.consumer.receive();
      try {
        const data = JSON.parse(msg.getData().toString());
        await this.sendFinalNotification(data);
        await this.consumer.acknowledge(msg);
      } catch (err) {
        this.logger.error('Failed to process DLQ message', err);
        this.consumer.negativeAcknowledge(msg);
      }
    }
  }

  private async sendFinalNotification(data: any) {
    const passengerId = data.passengerId;
    this.rabbitMqService.emit(
      SERVICES.NOTIFICATION_SERVICE,
      PATTERNS.NOTIFICATION_SERVICE.CREATE_NOTIFICATION,
      {
        userId: passengerId,
        createNotificationDto: {
          type: NotificationTypeEnum.TRIP_REQUEST_FAILED,
          title: 'Trip Request Failed',
          message:
            "We couldn't find a driver for your trip after multiple attempts. Please try again later.",
        },
        data: {},
      },
    );
    this.logger.warn(`Final notification sent to passenger ${passengerId}`);
  }
}
