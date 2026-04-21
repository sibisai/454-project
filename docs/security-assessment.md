# Security Assessment

Threat model identifying key threats and their mitigations, validated through functional testing, RBAC boundary checks, and vulnerability scans.

---

## Threat 1: SQL Injection (OWASP A03)

- **Description:** Attacker injects malicious SQL through user input fields to manipulate database queries, potentially extracting or modifying data.
- **Impact:** Data breach, unauthorized data modification, privilege escalation.
- **Mitigation:**
  - AWS WAF SQLi rule group blocks injection patterns at the edge
  - SQLAlchemy ORM parameterizes all database queries
  - Admin search inputs escape SQL wildcards (%, _) before use
  - NIST Control: SI-10 (Information Input Validation)

---

## Threat 2: Cross-Site Scripting (OWASP A07)

- **Description:** Attacker injects malicious scripts into web pages viewed by other users, potentially stealing session tokens or performing actions on behalf of victims.
- **Impact:** Session hijacking, credential theft, defacement.
- **Mitigation:**
  - AWS WAF CommonRuleSet blocks reflected XSS payloads at the edge
  - Content-Security-Policy header restricts script sources to `self` and `w.soundcloud.com`
  - X-XSS-Protection header enables browser-level filtering
  - React escapes output by default
  - NIST Control: SI-3 (Malicious Code Protection)

---

## Threat 3: Broken Access Control (OWASP A01)

- **Description:** Attacker bypasses authorization checks to access resources or perform actions beyond their privileges (e.g., moderating tracks they don't own).
- **Impact:** Unauthorized data access, privilege escalation, data manipulation.
- **Mitigation:**
  - RBAC middleware validates JWT role claims on every protected route
  - Track-specific roles (artist, moderator) checked against database, not token alone
  - Global and track-specific permissions evaluated separately
  - Unauthorized role escalation attempts return 403 Forbidden
  - NIST Control: AC-6 (Least Privilege)

---

## Threat 4: Credential Brute Force

- **Description:** Attacker attempts to guess user credentials through automated login attempts.
- **Impact:** Account compromise, unauthorized access.
- **Mitigation:**
  - Application-level sliding-window rate limiter caps failed logins at 5 per 60 seconds per IP
  - AWS WAF rate-limit rule caps total requests at 1,000 per 5 minutes per IP
  - bcrypt with automatic salt generation makes offline attacks computationally expensive
  - NIST Control: AC-7 (Unsuccessful Logon Attempts)

---

## Threat 5: Container and Dependency Vulnerabilities

- **Description:** Known CVEs in container base images or Python dependencies could be exploited to compromise the application.
- **Impact:** Remote code execution, container escape, data breach.
- **Mitigation:**
  - ECR image scanning runs on every push and flags known CVEs
  - Trivy scans Docker images for OS and library vulnerabilities
  - pip-audit checks Python dependencies against PyPI advisory database
  - Remediation documented in [scans/README.md](scans/README.md)
  - NIST Control: SI-2 (Flaw Remediation)

---

## Additional Security Measures

### Network Isolation
- VPC with private subnets for backend and database
- Security groups use SG-to-SG references (no CIDR blocks)
- RDS egress restricted to VPC CIDR only

### Encryption
- Data at rest: RDS (AES-256), S3 (SSE-S3), CloudTrail logs (KMS)
- Data in transit: TLS 1.2+ enforced, HSTS with 1-year max-age

### Secrets Management
- JWT secret stored in AWS Secrets Manager
- Injected at runtime via IAM-scoped access (no hardcoded credentials)

### Input Validation
- Pydantic schemas validate all API inputs
- Email regex validation and lowercase normalization
- Password requirements: 8+ chars, 1 digit, 1 special character
- Post content capped at 5,000 characters
