import { Global, Module } from '@nestjs/common';
import { PulsarService } from './pulsar.service';
import { PULSAR_SERVICE_TOKEN } from '@libs/common/utils';

@Global()
@Module({
  providers: [
    {
      provide: PULSAR_SERVICE_TOKEN,
      useClass: PulsarService,
    },
  ],
  exports: [PULSAR_SERVICE_TOKEN],
})
export class PulsarModule {}
