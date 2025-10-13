export default () => ({
  rabbitmq: {
    url: process.env.RABBITMQ_URL || '',
    queues: process.env.RABBITMQ_QUEUES || '',
  },
  redis: {
    host: process.env.REDIS_HOST || '',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10) || 6379,
    tls: process.env.REDIS_TLS === 'true',
  },
  aws: {
    region: process.env.AWS_REGION || '',
    accessKeyId: process.env.AWS_KEY || '',
    secretAccessKey: process.env.AWS_SECRET || '',
    place_index: process.env.AWS_PLACE_INDEX || '',
    route_calculator: process.env.AWS_ROUTE_CALCULATOR || '',
  },
  jwt_secret: process.env.JWT_SECRET || '',
  jwt_expiration_time: process.env.JWT_EXPIRATION_TIME || '120s',
  dynamodb: {
    port: parseInt(process.env.DYNAMODB_PORT || '9000', 10) || 9000,
    host: process.env.DYNAMODB_HOST || 'localhost',
  },
  services: {
    user: {
      port: parseInt(process.env.USER_SERVICE_PORT || '3001', 10) || 3001,
      database: {
        host: process.env.USER_SERVICE_DB_HOST || '',
        port: parseInt(process.env.USER_SERVICE_DB_PORT || '5432', 10) || 5432,
        username: process.env.USER_SERVICE_DB_USERNAME || '',
        password: process.env.USER_SERVICE_DB_PASSWORD || '',
        name: process.env.USER_SERVICE_DB_NAME || '',
      },
    },
    driver: {
      port: parseInt(process.env.DRIVER_SERVICE_PORT || '3003', 10) || 3003,
      local_url: process.env.DRIVER_SERVICE_LOCAL_URL || '',
      machanisms: {
        max_radius_km: parseInt(process.env.DRIVER_SERVICE_MAX_RADIUS_KM || '25', 10) || 25,
      }
    },
    trip: {
      port: parseInt(process.env.TRIP_SERVICE_PORT || '3002', 10) || 3002,
      database: {
        host: process.env.TRIP_SERVICE_DB_HOST || '',
        port: parseInt(process.env.TRIP_SERVICE_DB_PORT || '3306', 10) || 3306,
        username: process.env.TRIP_SERVICE_DB_USERNAME || '',
        password: process.env.TRIP_SERVICE_DB_PASSWORD || '',
        name: process.env.TRIP_SERVICE_DB_NAME || '',
      },
      queues: process.env.TRIP_SERVICE_QUEUES || '',
    },
  },
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
