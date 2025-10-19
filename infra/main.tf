module "vpc" {
  source = "./modules/vpc"
  environment         = var.environment
  cidr_block          = var.vpc_cidr
  private_subnets     = var.private_subnets
  public_subnets      = var.public_subnets
  availability_zones  = var.availability_zones
}

module "iam" {
  source      = "./modules/iam"
  environment = var.environment
}

module "rds" {
  source                 = "./modules/rds"
  environment            = var.environment
  postgres_username      = var.postgres_username
  postgres_password      = var.postgres_password
  postgres_db_name       = var.postgres_db_name
  mysql_username         = var.mysql_username
  mysql_password         = var.mysql_password
  mysql_db_name          = var.mysql_db_name
  subnet_ids             = module.vpc.private_subnet_ids
  security_group_ids     = var.security_group_ids
}

module "dynamodb" {
  source      = "./modules/dynamodb"
  environment = var.environment
}

module "redis" {
  source              = "./modules/redis"
  environment         = var.environment
  private_subnet_ids  = module.vpc.private_subnet_ids
  security_group_ids  = var.security_group_ids
}

module "rabbitmq" {
  source              = "./modules/rabbitmq"
  environment         = var.environment
  ami                 = var.rabbitmq_ami
  subnet_id           = module.vpc.private_subnet_ids[0]
  security_group_ids  = var.security_group_ids
}

module "kong" {
  source             = "./modules/kong"
  environment        = var.environment
  kong_ami           = var.kong_ami
  postgres_host  = module.rds.postgres_endpoint
  postgres_username  = var.postgres_username
  postgres_password  = var.postgres_password
}

module "ecs_services" {
  source              = "./modules/ecs_services"
  container_name      = var.container_name
  container_image     = var.container_image
  container_port      = var.container_port
  environment         = var.environment
  cluster_id          = var.ecs_cluster_id
  task_role_arn       = module.iam.ecs_task_role_arn
  subnet_ids          = module.vpc.private_subnet_ids
  security_group_ids  = var.security_group_ids
  desired_count       = var.desired_count
  redis_endpoint      = module.redis.redis_endpoint
  rabbitmq_host       = module.rabbitmq.rabbitmq_host
  kong_ip           = module.kong.kong_ip
}
