variable "environment" {}
variable "subnet_ids" {
  type = list(string)
}
variable "security_group_ids" {
  type = list(string)
}
variable "postgres_username" { type = string }
variable "postgres_password" { type = string }
variable "postgres_db_name"  { type = string }
variable "mysql_username" { type = string }
variable "mysql_password" { type = string }
variable "mysql_db_name"  { type = string }
