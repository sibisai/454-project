# guardduty.tf -- AWS GuardDuty threat detection
#
# GuardDuty monitors for malicious activity and unauthorized behavior. NIST SI-3, SI-4
# It analyzes VPC Flow Logs, CloudTrail events, and DNS logs to detect threats
# such as compromised instances, reconnaissance, and data exfiltration.

# Disabled — requires a paid AWS subscription (not available on free-tier accounts)
# resource "aws_guardduty_detector" "main" {
#   enable                       = true
#   finding_publishing_frequency = "FIFTEEN_MINUTES"
#
#   tags = {
#     Name        = "${var.project_name}-guardduty"
#     Project     = var.project_name
#     Environment = var.environment
#   }
# }
