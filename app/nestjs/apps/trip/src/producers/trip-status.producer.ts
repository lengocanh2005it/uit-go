import { UpdateTripStatusDto } from '@libs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import {
  JobNamesOfTripService,
  QueueNamesOfTripService,
} from '@trip-service/constants';
import { Queue } from 'bullmq';

@Injectable()
export class TripStatusProducer {
  constructor(
    @InjectQueue(QueueNamesOfTripService.tripStatus)
    private readonly tripStatusQueue: Queue,
  ) {}

  async updateTripStatus(
    updateTripStatusDto: UpdateTripStatusDto,
    delay: number,
  ) {
    await this.tripStatusQueue.add(
      JobNamesOfTripService.processTripStatus,
      updateTripStatusDto,
      {
        delay,
      },
    );
  }
}
