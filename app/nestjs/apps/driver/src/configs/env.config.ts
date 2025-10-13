export default () => ({
  port: parseInt(process.env.PORT || '3003', 10) || 3003,
  local_url: process.env.LOCAL_URL || '',
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
  kong_url: process.env.KONG_URL || '',
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
});
