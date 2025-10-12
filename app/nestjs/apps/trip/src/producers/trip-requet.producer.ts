import { ProcessTripRequestDto, queueNames } from '@libs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class TripRequestProducer {
  constructor(
    @InjectQueue(queueNames.trip.tripRequest) private readonly tripQueue: Queue,
  ) {}

  async processTripRequest(
    processTripRequestDto: ProcessTripRequestDto,
    delay: number,
  ) {
    await this.tripQueue.add('process-trip-request', processTripRequestDto, {
      delay,
    });
  }
}
