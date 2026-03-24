# IAM Strategy -- Least Privilege (NIST AC-6)
#
# ECS Execution Role: pull ECR images, write CloudWatch logs, read specific secrets
# ECS Task Role: app runtime only -- connect to RDS, read secrets, write logs
# Lambda Role: write CloudWatch logs, publish SNS alerts
# CloudTrail Role: stream events to specific CloudWatch log group
#
# All policies use resource-level scoping where possible.
# All policies use Action: specific and Resource: scoped ARN.
# Only remaining wildcard: sns:Publish Resource (see TODO -- pending SNS topic creation).

#--- ECS Task Execution Role ---
# Used by the ECS agent (not app code) to pull images, write logs,
# and inject secrets as env vars at launch time.

resource "aws_iam_role" "ecs_execution" {
  name = "${var.project_name}-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

# AWS-managed policy covers ECR image pulls + CloudWatch log writes.
# Secrets Manager access is added separately via inline policy below.
resource "aws_iam_role_policy_attachment" "ecs_execution_managed" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Scoped to specific secrets -- no wildcard access (NIST AC-6)
resource "aws_iam_role_policy" "ecs_execution_secrets" {
  name = "secrets-read"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "ReadSecrets"
      Effect = "Allow"
      Action = "secretsmanager:GetSecretValue"
      Resource = [
        aws_secretsmanager_secret.db_credentials.arn,
        aws_secretsmanager_secret.jwt_secret.arn,
      ]
    }]
  })
}

#--- ECS Task Role ---
# Assumed by the running container. Grants RDS IAM auth, Secrets Manager
# reads, and CloudWatch log writes for app-level logging.

resource "aws_iam_role" "ecs_task" {
  name = "${var.project_name}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_iam_role_policy" "ecs_task_runtime" {
  name = "app-runtime"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "RdsIamAuth"
        Effect   = "Allow"
        Action   = "rds-db:connect"
        Resource = "arn:aws:rds-db:${var.aws_region}:${data.aws_caller_identity.current.account_id}:dbuser:${aws_db_instance.main.resource_id}/${var.db_username}"
      },
      {
        # Scoped to specific secrets -- no wildcard access (NIST AC-6)
        Sid    = "ReadSecrets"
        Effect = "Allow"
        Action = "secretsmanager:GetSecretValue"
        Resource = [
          aws_secretsmanager_secret.db_credentials.arn,
          aws_secretsmanager_secret.jwt_secret.arn,
        ]
      },
      {
        Sid    = "WriteLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "${aws_cloudwatch_log_group.ecs_backend.arn}:*"
      }
    ]
  })
}

#--- Lambda Execution Role ---
# Used by Lambda functions that process CloudTrail security alerts.
# Needs CloudWatch Logs for execution logs and SNS Publish for alerts.

resource "aws_iam_role" "lambda_execution" {
  name = "${var.project_name}-lambda-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_iam_role_policy" "lambda_runtime" {
  name = "lambda-runtime"
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "WriteLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.project_name}-*"
      },
      {
        Sid    = "PublishAlerts"
        Effect = "Allow"
        Action = "sns:Publish"
        # TODO: scope to specific SNS topic ARN when created
        Resource = "*"
      }
    ]
  })
}

#--- CloudTrail -- CloudWatch Role ---
# Lets CloudTrail deliver API audit events to CloudWatch, enabling
# metric filters and alarms on security-sensitive API calls.

resource "aws_iam_role" "cloudtrail_cloudwatch" {
  name = "${var.project_name}-cloudtrail-cloudwatch-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "cloudtrail.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_iam_role_policy" "cloudtrail_to_cloudwatch" {
  name = "cloudtrail-to-cloudwatch"
  role = aws_iam_role.cloudtrail_cloudwatch.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "WriteCloudTrailLogs"
      Effect = "Allow"
      Action = [
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ]
      Resource = "${aws_cloudwatch_log_group.cloudtrail.arn}:*"
    }]
  })
}
