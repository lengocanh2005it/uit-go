output "postgres_endpoint" {
  value = aws_db_instance.postgres.endpoint
}
output "mysql_endpoint" {
  value = aws_db_instance.mysql.endpoint
}
