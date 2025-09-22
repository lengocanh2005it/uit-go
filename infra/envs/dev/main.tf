module "trip_service" {
source = "../../modules/ecs-service"
service_name = "trip-service"
image = "<ECR_URI>/trip-service:${var.image_tag}"
}