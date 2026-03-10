# waf.tf — WAF rules for CloudFront and ALB
#
# This file provisions:
#   - WAF Web ACL for CloudFront distribution
#   - WAF Web ACL for ALB
#   - Rate-based rule (throttle excessive requests)
#   - SQL injection rule set (AWS managed)
#   - XSS protection rule set (AWS managed)
#   - IP reputation list rule (AWS managed)
#   - WAF association with CloudFront and ALB resources
