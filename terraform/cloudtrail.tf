# cloudtrail.tf — CloudTrail audit logging, S3 log bucket, CloudWatch log groups

# ──────────────────────────────────────────────
# CloudTrail Logs S3 Bucket
# ──────────────────────────────────────────────

resource "aws_s3_bucket" "cloudtrail_logs" {
  bucket        = "${var.project_name}-cloudtrail-logs-${data.aws_caller_identity.current.account_id}"
  force_destroy = true # Dev convenience

  tags = {
    Name        = "${var.project_name}-cloudtrail-logs"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_s3_bucket_public_access_block" "cloudtrail_logs" {
  bucket = aws_s3_bucket.cloudtrail_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "cloudtrail_logs" {
  bucket = aws_s3_bucket.cloudtrail_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256" # SSE-S3
    }
  }
}

resource "aws_s3_bucket_policy" "cloudtrail_logs" {
  bucket = aws_s3_bucket.cloudtrail_logs.id

  # Ensure public access block is in place before attaching the policy
  depends_on = [aws_s3_bucket_public_access_block.cloudtrail_logs]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CloudTrailAclCheck"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.cloudtrail_logs.arn
      },
      {
        Sid    = "CloudTrailWrite"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.cloudtrail_logs.arn}/AWSLogs/${data.aws_caller_identity.current.account_id}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      }
    ]
  })
}

# ──────────────────────────────────────────────
# CloudTrail Trail — multi-region API audit logging
# ──────────────────────────────────────────────

resource "aws_cloudtrail" "main" {
  name                          = "${var.project_name}-trail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail_logs.id
  is_multi_region_trail         = true
  enable_log_file_validation    = true
  include_global_service_events = true

  # TODO: wire cloud_watch_logs_group_arn + IAM role to stream events to CloudWatch
  # Wait for bucket policy so CloudTrail can write on first event
  depends_on = [aws_s3_bucket_policy.cloudtrail_logs]

  tags = {
    Name        = "${var.project_name}-trail"
    Project     = var.project_name
    Environment = var.environment
  }
}

# ──────────────────────────────────────────────
# CloudWatch Log Groups
# ──────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "ecs_backend" {
  name              = "/ecs/${var.project_name}/backend"
  retention_in_days = 90

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "cloudtrail" {
  name              = "/cloudtrail/${var.project_name}"
  retention_in_days = 90

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}
