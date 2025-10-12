import { Trip, TripRequest } from '@/trip/src/entities';
import { ProcessTripRequestDto, queueNames } from '@libs/common';
import { TripRequestStatusEnum, TripStatusEnum } from '@libs/common/enums';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';

@Processor(queueNames.trip.tripRequest)
export class TripRequestProcessor extends WorkerHost {
  private readonly logger = new Logger(TripRequestProcessor.name);
  constructor(
    @InjectRepository(TripRequest)
    private readonly tripRequestRepository: Repository<TripRequest>,
    @InjectRepository(Trip) private readonly tripRepository: Repository<Trip>,
  ) {
    super();
  }

  async process(job: Job<ProcessTripRequestDto>) {
    const { tripRequestId } = job.data;
    const tripRequest = await this.tripRequestRepository.findOne({
      where: {
        id: tripRequestId,
      },
      relations: {
        trip: true,
      },
    });

    if (!tripRequest) {
      this.logger.warn(`Trip request ${tripRequestId} not found.`);
      return;
    }

    if (tripRequest.status === TripRequestStatusEnum.PENDING) {
      tripRequest.status = TripRequestStatusEnum.TIMEOUT;
      await this.tripRequestRepository.save(tripRequest);
      await this.tripRepository.update(
        { id: tripRequest.trip.id },
        { status: TripStatusEnum.CANCELLED },
      );
    }
    this.logger.log(`Trip request ${tripRequestId} processed successfully.`);
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
