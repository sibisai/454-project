#--- Networking ---

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = [aws_subnet.public_1.id, aws_subnet.public_2.id]
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = [aws_subnet.private_1.id, aws_subnet.private_2.id]
}

#--- Security Groups ---

output "alb_security_group_id" {
  description = "Security group ID for the ALB"
  value       = aws_security_group.alb.id
}

output "backend_security_group_id" {
  description = "Security group ID for the backend (ECS) tasks"
  value       = aws_security_group.backend.id
}

output "rds_security_group_id" {
  description = "Security group ID for the RDS instance"
  value       = aws_security_group.rds.id
}

#--- Database ---

output "rds_endpoint" {
  description = "Connection endpoint for the RDS PostgreSQL instance"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "rds_port" {
  description = "Port number for the RDS PostgreSQL instance"
  value       = aws_db_instance.main.port
}

#--- Container Registry ---

output "ecr_repository_url" {
  description = "URL of the ECR repository for backend images"
  value       = aws_ecr_repository.backend.repository_url
}

#--- IAM ---

output "ecs_execution_role_arn" {
  description = "ARN of the ECS task execution role (image pull + log write + secrets)"
  value       = aws_iam_role.ecs_execution.arn
}

output "ecs_task_role_arn" {
  description = "ARN of the ECS task role (app runtime permissions)"
  value       = aws_iam_role.ecs_task.arn
}

output "lambda_execution_role_arn" {
  description = "ARN of the Lambda execution role (logs + SNS alerts)"
  value       = aws_iam_role.lambda_execution.arn
}

output "cloudtrail_cloudwatch_role_arn" {
  description = "ARN of the CloudTrail-to-CloudWatch delivery role"
  value       = aws_iam_role.cloudtrail_cloudwatch.arn
}

#--- Secrets ---

output "db_credentials_secret_arn" {
  description = "ARN of the Secrets Manager secret containing DB credentials"
  value       = aws_secretsmanager_secret.db_credentials.arn
  sensitive   = true
}

output "jwt_secret_arn" {
  description = "ARN of the Secrets Manager secret containing the JWT signing key"
  value       = aws_secretsmanager_secret.jwt_secret.arn
  sensitive   = true
}
