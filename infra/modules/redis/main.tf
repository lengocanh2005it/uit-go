resource "aws_elasticache_subnet_group" "redis_subnet" {
  name       = "uit-go-redis-subnet-${var.environment}"
  subnet_ids = var.private_subnet_ids
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id          = "uit-go-redis-${var.environment}"
  engine                        = "redis"
  engine_version                = "6.x"
  node_type                     = "cache.t3.micro"
  automatic_failover_enabled    = false
  subnet_group_name             = aws_elasticache_subnet_group.redis_subnet.name
  security_group_ids            = var.security_group_ids
  port                          = 6379
  description = "Redis for uit-go application"
}
