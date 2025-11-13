import {
  JobNamesOfTripService,
  QueueNamesOfTripService,
} from '@/trip/src/constants';
import { AssignDriverDto, MAX_RETRY } from '@libs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class DriverAssignmentProducer {
  constructor(
    @InjectQueue(QueueNamesOfTripService.driverAssigment)
    private readonly driverAssignmentQueue: Queue,
  ) {}

  async assignDriver(assignDriverDto: AssignDriverDto) {
    await this.driverAssignmentQueue.add(
      JobNamesOfTripService.processDriverAssignment,
      assignDriverDto,
      {
        removeOnComplete: true,
        attempts: MAX_RETRY,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );
  }
}
