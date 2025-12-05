import { Global, Module } from '@nestjs/common';
import { S2Service } from './s2.service';
import { S2_SERVICE_TOKEN } from '@libs/common/utils';

@Global()
@Module({
  providers: [
    {
      provide: S2_SERVICE_TOKEN,
      useClass: S2Service,
    },
  ],
  exports: [S2_SERVICE_TOKEN],
})
export class S2Module {}
