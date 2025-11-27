import { AssignDriverDto } from '@libs/common';
import { InjectPulsarService } from '@libs/common/decorators';
import { PulsarService } from '@libs/common/modules/pulsar/pulsar.service';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Producer } from 'pulsar-client';

@Injectable()
export class DriverAssignmentProducer implements OnModuleInit, OnModuleDestroy {
  private producer: Producer;

  constructor(
    @InjectPulsarService() private readonly pulsarService: PulsarService,
  ) {}

  async onModuleInit() {
    this.producer = await this.pulsarService.createProducer('trip-create');
  }

  async onModuleDestroy() {
    if (this.producer) {
      await this.producer.flush();
      await this.producer.close();
    }
  }

  async assignDriver(assignDriverDto: AssignDriverDto) {
    await this.producer.send({
      data: Buffer.from(JSON.stringify(assignDriverDto)),
      partitionKey: assignDriverDto.passengerId,
    });
  }
}
