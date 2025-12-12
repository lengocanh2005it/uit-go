export default () => ({
  port: parseInt(process.env.PORT || '3004', 10) || 3004,
  mongo_uri: process.env.MONGO_URI || '',
  rabbitmq: {
    url: process.env.RABBITMQ_URL || '',
    queues: process.env.RABBITMQ_QUEUES || '',
  },
  redis: {
    clusterNodes: process.env.CLUSTER_NODES || '',
  },
  jwt_secret: process.env.JWT_SECRET || '',
  jwt_expiration_time: process.env.JWT_EXPIRATION_TIME || '120s',
  ipwho_url: process.env.IPWHO_URL || '',
  geoapify: {
    url: process.env.GEOAPIFY_URL || '',
    api_key: process.env.GEOAPIFY_API_KEY || '',
  },
  http: {
    timeout: parseInt(process.env.HTTP_TIMEOUT || '5000', 10) || 5000,
    max_redirects: parseInt(process.env.HTTP_TIMEOUT || '5', 10) || 5,
  },
});
