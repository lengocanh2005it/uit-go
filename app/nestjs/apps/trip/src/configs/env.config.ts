export default () => ({
  port: parseInt(process.env.PORT || '3002', 10) || 3002,
  database: {
    host: process.env.DATABASE_HOST || '',
    port: parseInt(process.env.DATABASE_PORT || '3306', 10) || 3306,
    username: process.env.DATBASE_USERNAME || '',
    password: process.env.DATABASE_PASSWORD || '',
    name: process.env.DATABASE_NAME || '',
  },
});
