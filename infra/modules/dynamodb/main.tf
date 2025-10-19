resource "aws_dynamodb_table" "driver" {
  name         = "driver"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "driver_id"

  attribute {
    name = "driver_id"
    type = "S"
  }

  global_secondary_index {
    name               = "GSI_User"
    hash_key           = "user_id"
    projection_type    = "ALL"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  tags = {
    Environment = var.environment
    Application = "uit-go"
  }
}

resource "aws_dynamodb_table" "vehicle" {
  name         = "vehicle"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "vehicle_id"

  attribute {
    name = "vehicle_id"
    type = "S"
  }

  tags = {
    Environment = var.environment
    Application = "uit-go"
  }
}