export const RABBITMQ_SERVCE_TOKEN = Symbol('RABBITMQ_SERVICE');
export const REDIS_SERVICE_TOKEN = Symbol('REDIS_SERVICE');
export const KONG_SERVICE_TOKEN = Symbol('KONG_SERVICE');
export const BULLMQ_SERVICE_TOKEN = Symbol('BULLMQ_SERVICE');
export const RABBITMQ_QUEUE_SERVICES = [
  'USER_SERVICE',
  'TRIP_SERVICE',
  'DRIVER_SERVICE',
] as const;
export type ServiceName = (typeof RABBITMQ_QUEUE_SERVICES)[number];
export const SERVICES = RABBITMQ_QUEUE_SERVICES.reduce(
  (acc, service) => {
    acc[service] = service;
    return acc;
  },
  {} as Record<ServiceName, ServiceName>,
);
