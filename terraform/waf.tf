# waf.tf -- AWS WAF Web ACLs for CloudFront and ALB
#
# Provides defense-in-depth per NIST SI-3 (Malicious Code Protection):
#   - AWS managed rule groups block known attack patterns at the edge
#   - Rate limiting mitigates brute-force and volumetric abuse
#   - CloudWatch metrics on every rule for visibility into blocked requests
#
# Two ACLs are required because CloudFront uses CLOUDFRONT scope (must be
# us-east-1) while the ALB uses REGIONAL scope.

#--- CloudFront WAF Web ACL (CLOUDFRONT scope) ---

resource "aws_wafv2_web_acl" "cloudfront" {
  name        = "${var.project_name}-cloudfront-waf"
  description = "WAF for CloudFront - managed rules and rate limiting, NIST SI-3"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # ---- Rule 1: Common Rule Set (NIST SI-3) ----
  # Covers OWASP Top 10 basics: XSS, bad inputs, path traversal,
  # protocol violations, and other generic attack signatures.
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesCommonRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-cf-common-rules"
      sampled_requests_enabled   = true
    }
  }

  # ---- Rule 2: SQL Injection Rule Set (NIST SI-3) ----
  # Inspects request bodies, query strings, URIs, and headers for
  # SQL injection patterns. Protects the API backend even though
  # the app uses parameterized queries (defense in depth).
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesSQLiRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-cf-sqli-rules"
      sampled_requests_enabled   = true
    }
  }

  # ---- Rule 3: Known Bad Inputs Rule Set (NIST SI-3) ----
  # Blocks requests that match known exploit payloads such as
  # Log4Shell (CVE-2021-44228), Spring4Shell, and other RCE vectors.
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-cf-bad-inputs-rules"
      sampled_requests_enabled   = true
    }
  }

  # ---- Rule 4: Rate Limiting ----
  # Blocks any single IP that exceeds 1000 requests in a 5-minute
  # window. Mitigates brute-force login attempts, scraping, and
  # lightweight volumetric attacks.
  rule {
    name     = "RateLimit"
    priority = 4

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 1000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-cf-rate-limit"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project_name}-cloudfront-waf"
    sampled_requests_enabled   = true
  }

  tags = {
    Name        = "${var.project_name}-cloudfront-waf"
    Project     = var.project_name
    Environment = var.environment
  }
}

#--- ALB WAF Web ACL (REGIONAL scope) ---

resource "aws_wafv2_web_acl" "alb" {
  name        = "${var.project_name}-alb-waf"
  description = "WAF for ALB - managed rules and rate limiting, NIST SI-3"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  # Same rule sets as CloudFront ACL -- applied here to catch direct ALB access
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesCommonRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-alb-common-rules"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesSQLiRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-alb-sqli-rules"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-alb-bad-inputs-rules"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "RateLimit"
    priority = 4

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 1000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project_name}-alb-rate-limit"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project_name}-alb-waf"
    sampled_requests_enabled   = true
  }

  tags = {
    Name        = "${var.project_name}-alb-waf"
    Project     = var.project_name
    Environment = var.environment
  }
}

#--- Associate ALB WAF with the Application Load Balancer ---

resource "aws_wafv2_web_acl_association" "alb" {
  resource_arn = aws_lb.main.arn
  web_acl_arn  = aws_wafv2_web_acl.alb.arn
}
