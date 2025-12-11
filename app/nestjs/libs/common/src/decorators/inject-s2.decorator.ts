import { makeInjectableDecorator } from '@golevelup/nestjs-common';
import { S2_SERVICE_TOKEN } from '@libs/common/utils';

export const InjectS2Service = makeInjectableDecorator(S2_SERVICE_TOKEN);
