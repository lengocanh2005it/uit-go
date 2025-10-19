variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "kong_ami" {
  description = "AMI ID for Kong EC2"
  type        = string
}

variable "postgres_host" {
  description = "Postgres endpoint for Kong"
  type        = string
}

variable "postgres_username" {
  description = "Postgres username for Kong"
  type        = string
}

variable "postgres_password" {
  description = "Postgres password for Kong"
  type        = string
}
