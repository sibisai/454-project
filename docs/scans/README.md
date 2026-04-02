# Vulnerability Scan Results

**Scan Date:** April 2, 2026
**Target:** SoundCloud Track Discussion Board (deployed on AWS)
**Scanned By:** Sibi (Infra Lead)

## Tools Used

| Tool | Version | Target | Scan Type |
|------|---------|--------|-----------|
| pip-audit | latest | `backend/requirements.txt` | Python dependency CVE scan |
| Trivy | latest | `soundcloud-discuss-backend:latest` Docker image | OS + Python package CVE scan |
| OWASP ZAP | stable (Docker) | `https://d3ve6290vu2dj4.cloudfront.net` | Web application baseline scan |

## Summary

| Tool | Result |
|------|--------|
| pip-audit | **Clean** -- no known vulnerabilities in direct dependencies |
| Trivy (OS) | 89 vulns (0 Critical, 8 High, 7 Medium, 73 Low) |
| Trivy (Python) | 5 vulns (0 Critical, 3 High, 1 Medium, 1 Low) |
| OWASP ZAP | 0 FAIL, 11 WARN, 56 PASS |

## Findings

### Finding 1: CVE-2026-23949 -- jaraco.context Path Traversal

- **Severity:** HIGH
- **Source:** Trivy (Python packages)
- **Package:** jaraco.context 5.3.0
- **Description:** Path traversal via malicious tar archives allows reading or writing files outside intended directories.
- **Fixed Version:** 6.1.0
- **Remediation:** Added `pip install --upgrade "jaraco.context>=6.1.0"` to `backend/Dockerfile` before installing requirements.
- **Status:** FIXED

### Finding 2: CVE-2026-24049 -- wheel Privilege Escalation

- **Severity:** HIGH
- **Source:** Trivy (Python packages)
- **Package:** wheel 0.45.1
- **Description:** Privilege escalation or arbitrary code execution via a malicious wheel file during package installation.
- **Fixed Version:** 0.46.2
- **Remediation:** Added `pip install --upgrade wheel` to `backend/Dockerfile` before installing requirements.
- **Status:** FIXED

### Finding 3: Missing Content-Security-Policy Header

- **Severity:** MEDIUM
- **Source:** OWASP ZAP [10038]
- **Affected:** All CloudFront responses for static assets (S3 origin)
- **Description:** No CSP header was set on static asset responses served via CloudFront, allowing potential XSS if scripts are injected.
- **Remediation:** Added `aws_cloudfront_response_headers_policy` in Terraform with CSP restricting sources to `'self'` and required SoundCloud domains.
- **Status:** FIXED

### Finding 4: Missing Strict-Transport-Security (HSTS) Header

- **Severity:** LOW
- **Source:** OWASP ZAP [10035]
- **Affected:** All CloudFront responses for static assets (S3 origin)
- **Description:** Without HSTS, browsers may allow HTTP connections on subsequent visits, enabling downgrade attacks.
- **Remediation:** Added HSTS header (max-age=31536000, includeSubDomains, preload) via CloudFront response headers policy.
- **Status:** FIXED

### Finding 5: CVE-2026-29111 -- systemd Arbitrary Code Execution

- **Severity:** HIGH
- **Source:** Trivy (OS packages)
- **Package:** libudev1 (systemd 257.9-1~deb13u1)
- **Description:** Arbitrary code execution or denial of service via spurious IPC in systemd. Affects the Debian base image.
- **Fixed Version:** Not yet available from Debian
- **Remediation:** Monitor for upstream Debian patch. Consider migrating to a distroless or Alpine base image for reduced OS attack surface.
- **Status:** ACCEPTED (no fix available; low exploitability in containerized ECS environment)

## Raw Scan Output

- `scan-pip-audit.txt` -- pip-audit results
- `scan-trivy.txt` -- Trivy full image scan
- `scan-zap.txt` -- OWASP ZAP baseline scan
