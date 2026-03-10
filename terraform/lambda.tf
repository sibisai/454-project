# lambda.tf — Lambda functions for audit processing and security alerts
#
# This file provisions:
#   - Lambda function: audit_processor (processes audit log events)
#   - Lambda function: security_alert (triggered on repeated failed logins)
#   - CloudWatch Events / EventBridge rules and targets
#   - SNS topic for security alert notifications
#   - Lambda permissions for event triggers
#   - CloudWatch log groups for Lambda functions
