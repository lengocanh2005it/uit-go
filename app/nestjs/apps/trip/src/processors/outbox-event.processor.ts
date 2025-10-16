import { queueNames } from '@libs/common/constants';
import { InjectRabbitMqService } from '@libs/common/decorators';
import { OutboxStatus } from '@libs/common/enums';
import { RabbitMQService } from '@libs/common/rabbitmq/rabbitmq.service';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { OutboxEvent } from '@trip-service/entities';
import { Repository } from 'typeorm';

@Processor(queueNames.outboxEvent)
export class OutbotEventProcessor extends WorkerHost {
  constructor(
    @InjectRepository(OutboxEvent)
    private readonly outboxEventRepository: Repository<OutboxEvent>,
    @InjectRabbitMqService() private readonly rabbitMqService: RabbitMQService,
  ) {
    super();
  }

  async process() {
    const pendingEvents = await this.outboxEventRepository.find({
      where: {
        status: OutboxStatus.PENDING,
      },
    });

    if (!pendingEvents?.length) return;

    for (const event of pendingEvents) {
      try {
        await this.rabbitMqService.send(
          'DRIVER_SERVICE',
          event.eventType.toLowerCase(),
          {
            ...event.payload,
            eventId: event.id,
          },
        );

        await this.outboxEventRepository.update(event.id, {
          status: OutboxStatus.SENT,
          sentAt: new Date(),
        });
      } catch (error) {
        console.error(`Failed to publish event ${event.id}`, error);
        await this.outboxEventRepository.update(event.id, {
          retryCount: event.retryCount + 1,
          errorMessage: error.message,
        });
      }
    }
  }
}
