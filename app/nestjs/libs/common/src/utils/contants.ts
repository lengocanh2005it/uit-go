export const RABBITMQ_SERVCE_TOKEN = Symbol('RABBITMQ_SERVICE');
export const REDIS_SERVICE_TOKEN = Symbol('REDIS_SERVICE');
export const RABBITMQ_QUEUE_SERVICES = [
  'USER_SERVICE',
  'TRIP_SERVICE',
  'DRIVER_SERVICE',
  'LOCATION_SERVICE',
] as const;
export type ServiceName = (typeof RABBITMQ_QUEUE_SERVICES)[number];
