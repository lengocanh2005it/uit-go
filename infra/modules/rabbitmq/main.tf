resource "aws_instance" "rabbitmq" {
  ami           = var.ami
  instance_type = "t3.micro"
  subnet_id     = var.subnet_id
  vpc_security_group_ids = var.security_group_ids
  tags = { Name = "rabbitmq-${var.environment}" }

  user_data = <<EOF
      #!/bin/bash
      sudo apt update
      sudo apt install -y rabbitmq-server
      sudo systemctl enable rabbitmq-server
      sudo systemctl start rabbitmq-server
      EOF
}
