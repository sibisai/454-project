# outputs.tf — Output values
#
# Outputs will be added here as resources are created:
#   - VPC ID and subnet IDs
#   - ALB DNS name (backend API)
#   - CloudFront distribution URL (frontend)
#   - RDS endpoint and port
#   - S3 bucket name

# ──────────────────────────────────────────────
# Networking
# ──────────────────────────────────────────────

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
