# rds.tf — RDS PostgreSQL instance, subnet group, encryption config
#
# This file provisions:
#   - DB subnet group (private subnets)
#   - Security group for RDS (allow inbound 5432 from ECS SG)
#   - RDS PostgreSQL 15 instance
#   - Storage encryption with AWS-managed KMS key
#   - Automated backups and retention period
#   - Multi-AZ disabled for dev, enabled for prod
