import { makeInjectableDecorator } from '@golevelup/nestjs-common';
import { SCHEDULER_SERVICE_TOKEN } from '@libs/common/utils';

export const InjectSchedulerService = makeInjectableDecorator(
  SCHEDULER_SERVICE_TOKEN,
);
