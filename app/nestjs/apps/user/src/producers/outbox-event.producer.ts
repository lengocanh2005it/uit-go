import { JobNames, QueueNames } from '@libs/common/constants';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class OutboxEventProducer {
  constructor(
    @InjectQueue(QueueNames.OUTBOX_EVENT_QUEUE)
    private readonly outboxEventQueue: Queue,
  ) {
    this.outboxEventQueue.add(
      JobNames.PUBLISH_OUTBOX_EVENT,
      {},
      {
        repeat: {
          every: 5000,
        },
        removeOnComplete: true,
      },
    );
  }
}
