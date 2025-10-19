output "kong_ip" {
  value = aws_instance.kong.public_ip
}
