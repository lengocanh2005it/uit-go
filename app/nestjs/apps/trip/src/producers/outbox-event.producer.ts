import { jobNames, queueNames } from '@libs/common/constants';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class OutboxEventProducer {
  constructor(
    @InjectQueue(queueNames.outboxEvent)
    private readonly outboxEventQueue: Queue,
  ) {
    this.outboxEventQueue.add(
      jobNames.publishOutboxEvent,
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
