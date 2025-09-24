import { makeInjectableDecorator } from '@golevelup/nestjs-common';
import { REDIS_SERVICE_TOKEN } from '@libs/common/utils';

export const InjectRedisService = makeInjectableDecorator(REDIS_SERVICE_TOKEN);
