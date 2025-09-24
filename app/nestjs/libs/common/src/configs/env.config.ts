export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10) || 3001,
  rabbitmq: {
    url: process.env.RABBITMQ_URL || '',
    queues: process.env.RABBITMQ_QUEUES || '',
  },
  redis: {
    host: process.env.REDIS_HOST || '',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10) || 6379,
    tls: process.env.REDIS_TLS === 'true',
  },
});
