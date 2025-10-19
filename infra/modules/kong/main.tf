resource "aws_instance" "kong" {
  ami           = var.kong_ami
  instance_type = "t3.micro"
  tags = {
    Name        = "kong-${var.environment}"
    Environment = var.environment
  }

    provisioner "remote-exec" {
      inline = [
        "sudo apt update",
        "sudo apt install -y docker.io",
        "sudo docker run -d --name kong -e KONG_DATABASE=postgres -e KONG_PG_HOST=${var.postgres_host} -e KONG_PG_USER=${var.postgres_username} -e KONG_PG_PASSWORD=${var.postgres_password} -e KONG_PROXY_ACCESS_LOG=/dev/stdout -e KONG_ADMIN_ACCESS_LOG=/dev/stdout -p 8000:8000 -p 8443:8443 -p 8001:8001 -p 8444:8444 kong"
      ]
  }
}
