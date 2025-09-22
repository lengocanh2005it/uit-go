terraform {
backend "s3" {
bucket = "my-terraform-state-bucket"
key = "infra/dev/terraform.tfstate"
region = "ap-southeast-1"
}
}