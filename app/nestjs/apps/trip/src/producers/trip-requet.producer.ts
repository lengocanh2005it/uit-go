import { ProcessTripRequestDto } from '@libs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import {
  JobNamesOfTripService,
  QueueNamesOfTripService,
} from '@trip-service/constants';
import { Queue } from 'bullmq';

@Injectable()
export class TripRequestProducer {
  constructor(
    @InjectQueue(QueueNamesOfTripService.tripRequest)
    private readonly tripQueue: Queue,
  ) {}

  async processTripRequest(
    processTripRequestDto: ProcessTripRequestDto,
    delay: number,
  ) {
    await this.tripQueue.add(
      JobNamesOfTripService.processTripRequest,
      processTripRequestDto,
      {
        delay,
      },
    );
  }
}
