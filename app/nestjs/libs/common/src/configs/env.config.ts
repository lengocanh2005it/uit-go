export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10) || 3001,
  rabbitmq: {
    url: process.env.RABBITMQ_URL || '',
    queues: process.env.RABBITMQ_QUEUES || '',
  },
});
