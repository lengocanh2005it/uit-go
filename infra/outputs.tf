output "rabbitmq_host" {
  value = module.rabbitmq.rabbitmq_host
}

output "redis_endpoint" {
  value = module.redis.redis_endpoint
}

output "driver_table_name" {
  value = module.dynamodb.driver_table_name
}

output "vehicle_table_name" {
  value = module.dynamodb.vehicle_table_name
}

output "postgres_endpoint" {
  value = module.rds.postgres_endpoint
}

output "mysql_endpoint" {
  value = module.rds.mysql_endpoint
}

output "kong_ip" {
  value = module.kong.kong_ip
}
