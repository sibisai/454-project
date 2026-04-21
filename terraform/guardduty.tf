# guardduty.tf -- AWS GuardDuty threat detection
#
# GuardDuty monitors for malicious activity and unauthorized behavior. NIST SI-3, SI-4
# It analyzes VPC Flow Logs, CloudTrail events, and DNS logs to detect threats
# such as compromised instances, reconnaissance, and data exfiltration.
#
# ============================================================================
# ENABLING GUARDDUTY (for paid AWS accounts)
# ============================================================================
# GuardDuty is currently disabled because it requires a paid AWS subscription
# and is not available on free-tier accounts.
#
# To enable GuardDuty:
# 1. Uncomment the resource block below
# 2. Run: terraform plan -out=tfplan
# 3. Review the plan to confirm GuardDuty detector will be created
# 4. Run: terraform apply tfplan
#
# GuardDuty pricing (as of 2024):
# - 30-day free trial for new accounts
# - After trial: ~$4/GB for VPC Flow Logs, ~$1/million CloudTrail events
# - Typical small app: $10-50/month
#
# To disable again: comment out the block and run terraform apply
# ============================================================================

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
