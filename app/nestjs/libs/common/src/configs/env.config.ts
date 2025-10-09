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
    },
  },
  kong_url: process.env.KONG_URL || '',
});
