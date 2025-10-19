resource "aws_db_subnet_group" "this" {
  name       = "uit-go-db-subnet-${var.environment}"
  subnet_ids = var.subnet_ids
}

resource "aws_db_instance" "postgres" {
  identifier            = "uit-go-postgres-${var.environment}"
  engine                = "postgres"
  instance_class        = "db.t3.micro"
  allocated_storage     = 20
  db_name               = var.postgres_db_name
  username              = var.postgres_username
  password              = var.postgres_password
  db_subnet_group_name  = aws_db_subnet_group.this.name
  skip_final_snapshot   = true
  publicly_accessible   = false
  vpc_security_group_ids = var.security_group_ids
  tags = {
    Name        = "uit-go-postgres-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_db_instance" "mysql" {
  identifier            = "uit-go-mysql-${var.environment}"
  engine                = "mysql"
  instance_class        = "db.t3.micro"
  allocated_storage     = 20
  db_name               = var.mysql_db_name
  username              = var.mysql_username
  password              = var.mysql_password
  db_subnet_group_name  = aws_db_subnet_group.this.name
  skip_final_snapshot   = true
  publicly_accessible   = false
  vpc_security_group_ids = var.security_group_ids
  tags = {
    Name        = "uit-go-mysql-${var.environment}"
    Environment = var.environment
  }
}
