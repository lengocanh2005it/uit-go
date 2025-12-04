export default () => ({
  port: parseInt(process.env.PORT || '3002', 10) || 3002,
  database: {
    host: process.env.DATABASE_HOST || '',
    port: parseInt(process.env.DATABASE_PORT || '3306', 10) || 3306,
    username: process.env.DATBASE_USERNAME || '',
    password: process.env.DATABASE_PASSWORD || '',
    name: process.env.DATABASE_NAME || '',
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL || '',
    queues: process.env.RABBITMQ_QUEUES || '',
  },
  redis: {
    host: process.env.REDIS_HOST || '',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10) || 6379,
    tls: process.env.REDIS_TLS === 'true',
  },
  jwt_secret: process.env.JWT_SECRET || '',
  jwt_expiration_time: process.env.JWT_EXPIRATION_TIME || '120s',
  ipwho_url: process.env.IPWHO_URL || '',
  bullmq: {
    host: process.env.BULLMQ_HOST || 'redis',
    port: parseInt(process.env.BULLMQ_PORT || '6379', 10) || 6379,
  },
  geoapify: {
    url: process.env.GEOAPIFY_URL || '',
    api_key: process.env.GEOAPIFY_API_KEY || '',
  },
  http: {
    timeout: parseInt(process.env.HTTP_TIMEOUT || '5000', 10) || 5000,
    max_redirects: parseInt(process.env.HTTP_TIMEOUT || '5', 10) || 5,
  },
  pulsar: {
    service_url: process.env.PULSAR_SERVICE_URL || '',
  },
});
