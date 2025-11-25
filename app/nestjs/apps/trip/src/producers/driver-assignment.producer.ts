import { AssignDriverDto } from '@libs/common';
import { InjectPulsarService } from '@libs/common/decorators';
import { PulsarService } from '@libs/common/modules/pulsar/pulsar.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DriverAssignmentProducer {
  constructor(
    @InjectPulsarService() private readonly pulsarService: PulsarService,
  ) {}

  async assignDriver(assignDriverDto: AssignDriverDto) {
    const producer = await this.pulsarService.createProducer('trip-create');
    await producer.send({
      data: Buffer.from(JSON.stringify(assignDriverDto)),
      partitionKey: assignDriverDto.passengerId,
    });
    await producer.flush();
    await producer.close();
  }
}
