# rds.tf — RDS PostgreSQL instance, subnet group, encryption config
#
# This file provisions:
#   - DB subnet group (private subnets)
#   - RDS PostgreSQL 15 instance
#   - Storage encryption with AWS-managed KMS key
#   - Automated backups and retention period
#   - Multi-AZ disabled for dev, enabled for prod

# ──────────────────────────────────────────────
# DB Subnet Group — isolates database to private subnets only
# ──────────────────────────────────────────────

resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = [aws_subnet.private_1.id, aws_subnet.private_2.id]

  tags = {
    Name        = "${var.project_name}-db-subnet-group"
    Project     = var.project_name
    Environment = var.environment
  }
}

# ──────────────────────────────────────────────
# RDS PostgreSQL Instance
# ──────────────────────────────────────────────

resource "aws_db_instance" "main" {
  identifier     = "${var.project_name}-db"
  engine         = "postgres"
  engine_version = "15"
  instance_class = "db.t3.micro" # Free tier eligible

  allocated_storage = 20
  db_name           = "soundcloud_discuss"
  username          = var.db_username
  password          = var.db_password

  # High availability — disabled for dev/free tier
  multi_az = false

  # Never expose database to internet — NIST AC-6
  publicly_accessible = false

  # Encryption at rest — satisfies NIST SC-28
  storage_encrypted = true

  # Network placement — private subnets + RDS security group
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  # Backup and lifecycle — 7-day retention for point-in-time recovery
  backup_retention_period = 7
  skip_final_snapshot     = true # Dev environment only
  deletion_protection     = false # Dev environment only
  apply_immediately       = true

  tags = {
    Name        = "${var.project_name}-db"
    Project     = var.project_name
    Environment = var.environment
  }
}
