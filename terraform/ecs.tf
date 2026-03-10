# ecs.tf — ECS Fargate cluster, task definition, service, ALB
#
# This file provisions:
#   - ECS Fargate cluster
#   - Task definition (FastAPI container, CPU/memory, env vars, logging)
#   - ECS service with desired count and deployment configuration
#   - Application Load Balancer (public subnets)
#   - ALB target group (health check on /health)
#   - ALB listener (HTTP:80, HTTPS:443)
#   - Security groups for ALB and ECS tasks
#   - CloudWatch log group for container logs
