import { makeInjectableDecorator } from '@golevelup/nestjs-common';
import { PULSAR_SERVICE_TOKEN } from '@libs/common/utils';

export const InjectPulsarService =
  makeInjectableDecorator(PULSAR_SERVICE_TOKEN);
