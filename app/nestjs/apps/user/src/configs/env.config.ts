export default () => ({
  port: parseInt(process.env.PORT || '3001', 10) || 3001,
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10) || 5432,
    username: process.env.DATABASE_USERNAME || '',
    password: process.env.DATABASE_PASSWORD || '',
    name: process.env.DATABASE_NAME || '',
  },
});
