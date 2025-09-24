import { makeInjectableDecorator } from '@golevelup/nestjs-common';
import { RABBITMQ_SERVCE_TOKEN } from '@libs/common/utils';

export const InjectRabbitMqService = makeInjectableDecorator(
  RABBITMQ_SERVCE_TOKEN,
);
