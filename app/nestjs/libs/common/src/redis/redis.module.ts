import { REDIS_SERVICE_TOKEN } from '@libs/common/utils';
import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_SERVICE_TOKEN,
      useClass: RedisService,
    },
  ],
  exports: [REDIS_SERVICE_TOKEN],
})
export class RedisModule {}
