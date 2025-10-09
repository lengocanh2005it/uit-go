import { makeInjectableDecorator } from '@golevelup/nestjs-common';
import { KONG_SERVICE_TOKEN } from '@libs/common/utils';

export const InjectKongService = makeInjectableDecorator(KONG_SERVICE_TOKEN);
