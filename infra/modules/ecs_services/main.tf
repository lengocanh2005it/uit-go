resource "aws_ecs_task_definition" "task" {
  family                   = "${var.container_name}-${var.environment}"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = var.task_role_arn
  task_role_arn            = var.task_role_arn

  container_definitions = jsonencode([
    {
      name      = var.container_name
      image     = var.container_image
      essential = true
      portMappings = [{ containerPort = var.container_port, hostPort = var.container_port }]
      environment = [
        { name = "NODE_ENV", value = var.environment },
        { name = "REDIS_HOST", value = var.redis_endpoint },
        { name = "RABBITMQ_HOST", value = var.rabbitmq_host },
        { name = "KONG_HOST", value = var.kong_ip }
      ]
    }
  ])
}

resource "aws_ecs_service" "service" {
  name            = "${var.container_name}-${var.environment}"
  cluster         = var.cluster_id
  task_definition = aws_ecs_task_definition.task.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = var.security_group_ids
    assign_public_ip = false
  }
}
