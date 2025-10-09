import { Global, Module } from '@nestjs/common';
import { KongService } from './kong.service';
import { KONG_SERVICE_TOKEN } from '@libs/common/utils';

@Global()
@Module({
  providers: [
    {
      provide: KONG_SERVICE_TOKEN,
      useClass: KongService,
    },
  ],
  exports: [KONG_SERVICE_TOKEN],
})
export class KongModule {}
