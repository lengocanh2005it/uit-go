export const RABBITMQ_SERVCE_TOKEN = Symbol('RABBITMQ_SERVICE');
export const PULSAR_SERVICE_TOKEN = Symbol('PULSAR_SERVICE');
export const REDIS_SERVICE_TOKEN = Symbol('REDIS_SERVICE');
export const S2_SERVICE_TOKEN = Symbol('S2');
export const BULLMQ_SERVICE_TOKEN = Symbol('BULLMQ_SERVICE');
export const RABBITMQ_QUEUE_SERVICES = [
  'USER_SERVICE',
  'TRIP_SERVICE',
  'DRIVER_SERVICE',
  'NOTIFICATION_SERVICE',
] as const;
export type ServiceName = (typeof RABBITMQ_QUEUE_SERVICES)[number];
export const SERVICES = RABBITMQ_QUEUE_SERVICES.reduce(
  (acc, service) => {
    acc[service] = service;
    return acc;
  },
  {} as Record<ServiceName, ServiceName>,
);
export const PULSAR_MAX_REDELIVER_COUNT = 3;
export const PULSAR_REDELIVER_TIMEOUT = 2000;
export const REDLOCK_RETRY_COUNT = 3;
export const REDLOCK_RETRY_DELAY = 100;
export const MAX_RETRY = 5;
export const BACKOFF_MS = 5000;
