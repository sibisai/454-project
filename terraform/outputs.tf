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

#--- ECS ---

output "ecs_cluster_name" {
  description = "Name of the ECS Fargate cluster"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "Name of the ECS backend service"
  value       = aws_ecs_service.backend.name
}

#--- Load Balancer ---

output "alb_dns_name" {
  description = "DNS name of the ALB (use this to test the backend)"
  value       = aws_lb.main.dns_name
}

output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = aws_lb.main.arn
}

output "target_group_arn" {
  description = "ARN of the backend target group"
  value       = aws_lb_target_group.backend.arn
}

#--- Frontend / CloudFront ---

output "frontend_bucket_name" {
  description = "Name of the S3 bucket for React frontend assets"
  value       = aws_s3_bucket.frontend.id
}

output "frontend_bucket_arn" {
  description = "ARN of the S3 bucket for React frontend assets"
  value       = aws_s3_bucket.frontend.arn
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.frontend.id
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution (user-facing URL)"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

#--- WAF ---

output "cloudfront_waf_acl_arn" {
  description = "ARN of the WAF Web ACL attached to CloudFront"
  value       = aws_wafv2_web_acl.cloudfront.arn
}

output "alb_waf_acl_arn" {
  description = "ARN of the WAF Web ACL attached to the ALB"
  value       = aws_wafv2_web_acl.alb.arn
}

#--- GuardDuty (disabled — requires paid subscription) ---

#--- Lambda ---

output "audit_processor_lambda_arn" {
  description = "ARN of the audit processor Lambda function"
  value       = aws_lambda_function.audit_processor.arn
}

output "security_alert_lambda_arn" {
  description = "ARN of the security alert Lambda function"
  value       = aws_lambda_function.security_alert.arn
}
