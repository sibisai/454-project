# NIST SP 800-53 Compliance Checklist

Maps project security controls to NIST SP 800-53 control families (AC, AU, SC, SI).

---

## Access Control (AC)

| Control ID | Control Name | Implementation | Status |
|------------|-------------|----------------|--------|
| AC-2 | Account Management | User registration with email validation, admin user management endpoints, role assignment (Guest/User/Artist/Moderator/Admin) | IMPLEMENTED |
| AC-3 | Access Enforcement | RBAC middleware enforces permissions at route level; track-specific roles checked against database | IMPLEMENTED |
| AC-6 | Least Privilege | IAM policies use scoped ARNs (no wildcards); ECS task role limited to RDS connect and specific CloudWatch log group | IMPLEMENTED |
| AC-7 | Unsuccessful Logon Attempts | Application-level rate limiter caps failed logins at 5 per 60 seconds per IP; WAF rate-limit rule caps 1,000 requests per 5 minutes | IMPLEMENTED |

---

## Audit and Accountability (AU)

| Control ID | Control Name | Implementation | Status |
|------------|-------------|----------------|--------|
| AU-2 | Audit Events | CloudTrail multi-region trail captures AWS API calls; application audit_log table records moderation/admin actions | IMPLEMENTED |
| AU-3 | Content of Audit Records | Audit records include actor ID, target type, target ID, JSONB details, and timestamp | IMPLEMENTED |
| AU-9 | Protection of Audit Information | CloudTrail logs stored in encrypted S3 bucket with public access blocked; log file validation enabled for tamper detection | IMPLEMENTED |
| AU-11 | Audit Record Retention | CloudWatch Logs retention set to 90 days | IMPLEMENTED |

---

## System and Communications Protection (SC)

| Control ID | Control Name | Implementation | Status |
|------------|-------------|----------------|--------|
| SC-7 | Boundary Protection | VPC with public/private subnet separation; security groups use SG-to-SG references; RDS egress restricted to VPC CIDR | IMPLEMENTED |
| SC-8 | Transmission Confidentiality | TLS 1.2+ enforced via CloudFront; HSTS header with 1-year max-age, includeSubDomains, preload | IMPLEMENTED |
| SC-13 | Cryptographic Protection | bcrypt password hashing; JWT signed with HS256; AWS-managed KMS keys for encryption | IMPLEMENTED |
| SC-28 | Protection of Information at Rest | RDS storage encryption (AES-256); S3 buckets use SSE-S3; CloudTrail logs encrypted | IMPLEMENTED |

---

## System and Information Integrity (SI)

| Control ID | Control Name | Implementation | Status |
|------------|-------------|----------------|--------|
| SI-2 | Flaw Remediation | ECR image scanning on push; Trivy scans Docker images; pip-audit checks Python dependencies | IMPLEMENTED |
| SI-3 | Malicious Code Protection | WAF CommonRuleSet blocks XSS payloads; CSP headers restrict script sources; X-XSS-Protection header enabled | IMPLEMENTED |
| SI-4 | Information System Monitoring | CloudTrail logs to CloudWatch; WAF metrics enabled on all rules; Lambda alerts for security events | IMPLEMENTED |
| SI-10 | Information Input Validation | Pydantic schemas validate all API inputs; SQL wildcards escaped; SQLAlchemy ORM parameterizes queries | IMPLEMENTED |

---

## Summary

| Control Family | Controls Implemented | Status |
|----------------|---------------------|--------|
| Access Control (AC) | 4 | COMPLETE |
| Audit and Accountability (AU) | 4 | COMPLETE |
| System and Communications Protection (SC) | 4 | COMPLETE |
| System and Information Integrity (SI) | 4 | COMPLETE |
| **Total** | **16** | **COMPLETE** |
