export default () => ({
  port: parseInt(process.env.PORT || '3003', 10) || 3003,
  local_url: process.env.LOCAL_URL || '',
});
