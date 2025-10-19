# AWS region
variable "aws_region" {
  description = "AWS Region"
  type        = string
  default     = "ap-southeast-1"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "dev"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnets" {
  description = "Public subnet CIDRs"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnets" {
  description = "Private subnet CIDRs"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24"]
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["ap-southeast-1a", "ap-southeast-1b"]
}

variable "security_group_ids" {
  description = "Security group IDs for resources"
  type        = list(string)
  default     = []
}

variable "postgres_username" {
  description = "Postgres DB username"
  type        = string
  default     = "trip"
}

variable "postgres_password" {
  description = "Postgres DB password"
  type        = string
  default     = "password"
}

variable "postgres_db_name" {
  description = "Postgres database name"
  type        = string
  default     = "trip_db"
}

variable "mysql_username" {
  description = "MySQL DB username"
  type        = string
  default     = "user"
}

variable "mysql_password" {
  description = "MySQL DB password"
  type        = string
  default     = "password"
}

variable "mysql_db_name" {
  description = "MySQL database name"
  type        = string
  default     = "user_db"
}

variable "container_name" {
  description = "Name of the ECS container"
  type        = string
  default     = "uit-go-app"
}

variable "container_image" {
  description = "Docker image for ECS container"
  type        = string
  default     = "your-docker-image:latest"
}

variable "container_port" {
  description = "Container port exposed"
  type        = number
  default     = 3000
}

variable "ecs_cluster_id" {
  description = "ECS Cluster ID"
  type        = string
  default     = ""
}

variable "desired_count" {
  description = "Number of ECS tasks"
  type        = number
  default     = 1
}

variable "kong_ami" {
  description = "AMI for Kong EC2"
  type        = string
  default     = "ami-0c55b159cbfafe1f0"
}

variable "rabbitmq_ami" {
  description = "AMI for RabbitMQ EC2"
  type        = string
  default     = "ami-0c55b159cbfafe1f0"
}

variable "db_subnet_group_name" {
  description = "RDS DB subnet group name"
  type        = string
  default     = "uit-go-db-subnet"
}

variable "db_username" {
  description = "RDS DB subnet group name"
  type        = string
  default     = "admin"
}

variable "db_password" {
  description = "RDS DB subnet group name"
  type        = string
  default     = "password123"
}