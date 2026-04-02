# lambda.tf -- Lambda functions for audit processing and security alerts

#--- Package Lambda handler code ---

data "archive_file" "audit_processor" {
  type        = "zip"
  source_file = "${path.module}/../lambda/audit_processor/handler.py"
  output_path = "${path.module}/../lambda/audit_processor.zip"
}

data "archive_file" "security_alert" {
  type        = "zip"
  source_file = "${path.module}/../lambda/security_alert/handler.py"
  output_path = "${path.module}/../lambda/security_alert.zip"
}

#--- CloudWatch Log Groups for Lambda functions ---
# Explicit log groups with 90-day retention (matching ECS and CloudTrail groups).
# Without these, Lambda auto-creates groups with infinite retention.

resource "aws_cloudwatch_log_group" "audit_processor" {
  name              = "/aws/lambda/${var.project_name}-audit-processor"
  retention_in_days = 90

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "security_alert" {
  name              = "/aws/lambda/${var.project_name}-security-alert"
  retention_in_days = 90

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

#--- Audit Processor Lambda ---
# Processes CloudTrail events from CloudWatch Logs. NIST AU-2

resource "aws_lambda_function" "audit_processor" {
  function_name    = "${var.project_name}-audit-processor"
  runtime          = "python3.11"
  handler          = "handler.lambda_handler"
  role             = aws_iam_role.lambda_execution.arn
  filename         = data.archive_file.audit_processor.output_path
  source_code_hash = data.archive_file.audit_processor.output_base64sha256
  timeout          = 30
  memory_size      = 128

  tags = {
    Name        = "${var.project_name}-audit-processor"
    Project     = var.project_name
    Environment = var.environment
  }
}

#--- Security Alert Lambda ---
# Sends alerts on suspicious CloudTrail events. NIST SI-4

resource "aws_lambda_function" "security_alert" {
  function_name    = "${var.project_name}-security-alert"
  runtime          = "python3.11"
  handler          = "handler.lambda_handler"
  role             = aws_iam_role.lambda_execution.arn
  filename         = data.archive_file.security_alert.output_path
  source_code_hash = data.archive_file.security_alert.output_base64sha256
  timeout          = 30
  memory_size      = 128

  environment {
    variables = {
      SNS_TOPIC_ARN = "" # Placeholder -- add SNS topic ARN when created
    }
  }

  tags = {
    Name        = "${var.project_name}-security-alert"
    Project     = var.project_name
    Environment = var.environment
  }
}

#--- CloudWatch Log Subscription (CloudTrail -> Audit Processor) ---

resource "aws_lambda_permission" "cloudwatch_audit" {
  statement_id  = "AllowCloudWatchInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.audit_processor.function_name
  principal     = "logs.amazonaws.com"
  source_arn    = "${aws_cloudwatch_log_group.cloudtrail.arn}:*"
}

resource "aws_cloudwatch_log_subscription_filter" "audit_processor" {
  name            = "audit-processor-trigger"
  log_group_name  = aws_cloudwatch_log_group.cloudtrail.name
  filter_pattern  = ""
  destination_arn = aws_lambda_function.audit_processor.arn

  depends_on = [aws_lambda_permission.cloudwatch_audit]
}

#--- CloudWatch Log Subscription (CloudTrail -> Security Alert) ---

resource "aws_lambda_permission" "cloudwatch_security" {
  statement_id  = "AllowCloudWatchInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.security_alert.function_name
  principal     = "logs.amazonaws.com"
  source_arn    = "${aws_cloudwatch_log_group.cloudtrail.arn}:*"
}

resource "aws_cloudwatch_log_subscription_filter" "security_alert" {
  name            = "security-alert-trigger"
  log_group_name  = aws_cloudwatch_log_group.cloudtrail.name
  filter_pattern  = ""
  destination_arn = aws_lambda_function.security_alert.arn

  depends_on = [aws_lambda_permission.cloudwatch_security]
}
