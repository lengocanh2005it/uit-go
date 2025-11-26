import { MAX_RETRY, payloadIsObject } from '@libs/common';
import { EventRoutingMap } from '@libs/common/configs';
import { QueueNames } from '@libs/common/constants';
import { InjectRabbitMqService } from '@libs/common/decorators';
import { OutboxStatus } from '@libs/common/enums';
import { RabbitMQService } from '@libs/common/modules/rabbitmq/rabbitmq.service';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { OutboxEvent } from '@trip-service/entities';
import { Repository } from 'typeorm';

@Processor(QueueNames.OUTBOX_EVENT_QUEUE)
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
      const route = EventRoutingMap[event.eventType];
      if (!route) continue;

      this.rabbitMqService.emit(route.service, route.pattern, {
        ...(payloadIsObject(event.payload)
          ? event.payload
          : { payload: event.payload }),
        eventId: event.id,
      });

      event.status = OutboxStatus.SENT;
      event.sentAt = new Date();

      await this.outboxEventRepository.save(event);
    }
  }
}
