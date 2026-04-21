# SoundCloud Track Discussion Board: Design Document

**Team:** Alyaan Mir, Shyan Khezani, Dhuha Abdulhussein, Sibi Ubeshkumar, Anthony Vasquez  
**Course:** CPSC-454 SP26 Final Project  
**Professor:** Deo Halili

---

## 1. Introduction and Project Overview

The SoundCloud Track Discussion Board is a cloud-hosted web application that enhances track discussions by replacing timeline-based comments with threaded conversations, moderator controls, and role-based cooperation. This platform demonstrates an understanding of Infrastructure as Code (IaC), IAM, VPC segmentation, encryption, audit logging, and compliance-aligned design with AWS deployment techniques.

### Project Objectives

- Build a functional and complete cloud-hosted discussion platform for SoundCloud tracks
- Demonstrate secure cloud deployment on AWS
- Implement strong authentication, authorization, and least privilege controls
- Apply Terraform-based infrastructure automation
- Map implemented controls to NIST SP 800-53
- Ensure consistent deployment and testing workflows

### Team Scope and Contributions

| Member | Contributions |
|--------|--------------|
| **Sibi** | Terraform infrastructure (VPC, ECS, RDS, ALB, WAF, CloudTrail, IAM), AWS deployment and runbook documentation |
| **Shyan** | Backend API development (FastAPI routes, RBAC middleware, JWT auth, audit logging), Docker Compose setup, database schema design |
| **Alyaan** | Backend API development (track routes, moderation endpoints, oEmbed integration), input validation schemas |
| **Dhuha** | Frontend development (React UI, track discussion components, admin panel, retro theme design) |
| **Anthony** | Security architecture documentation, NIST compliance mapping, vulnerability scanning and testing |

---

## 2. System Architecture

The system implements a secure three-tier AWS deployment architecture:

- **Frontend Layer:** Static assets served from S3 via CloudFront with AWS WAF protection
- **Application Layer:** FastAPI backend running on ECS Fargate in private subnets, accessed through an Application Load Balancer
- **Data Layer:** PostgreSQL database on RDS with encryption at rest, accessible only from the backend security group

### Course Concept Integration

| Concept | Implementation |
|---------|---------------|
| **Virtualization** | ECS Fargate runs the backend in Docker containers, abstracting the underlying host OS. Each task is an isolated compute unit with its own network interface. |
| **Infrastructure as Code** | The entire AWS environment (VPC, subnets, security groups, ECS cluster, RDS instance, WAF, CloudTrail, IAM roles) is defined across ~10 Terraform configuration files. |
| **Software-Defined Networking** | The VPC uses programmatically defined route tables, subnets, and security groups with SG-to-SG references (not CIDR blocks). |
| **Distributed Systems** | Architecture spans two Availability Zones with an ALB distributing traffic. CloudFront caches static assets at edge locations globally. |
| **Service-Oriented Architecture** | Three independent services (React frontend, FastAPI backend, PostgreSQL database) communicate over well-defined HTTP/REST interfaces. |

---

## 3. Data Model and Persistence Design

The PostgreSQL relational schema includes the following core entities:

- **users** - User accounts with roles and authentication data
- **tracks** - SoundCloud track listings with oEmbed metadata
- **posts** - Threaded discussion posts with self-referencing `parent_id` for nested replies
- **audit_logs** - Immutable records of moderation and admin actions
- **track_moderators** - Junction table for per-track moderator delegation
- **track_likes** - User likes on tracks
- **post_votes** - Upvote/downvote on posts

The self-referencing `parent_id` field in the posts table enables layered discussion threads while maintaining immutable auditability for moderation and admin operations.

---

## 4. API Design

The FastAPI backend exposes the following endpoint groups:

| Category | Endpoints |
|----------|-----------|
| **Authentication** | Register, login, refresh token, logout |
| **Tracks** | CRUD operations, like/unlike, search |
| **Posts** | Create, read, vote, pin/unpin, delete |
| **Moderation** | Remove posts, ban users (per-track scope) |
| **Admin** | User management, audit logs, analytics, stats |
| **Discovery** | Trending, new arrivals, recently active, personalized recommendations |
| **Health** | Liveness and readiness probes |

RBAC middleware enforces permissions at the route level with five roles: Guest (read-only), User, Artist (track creator), Moderator (delegated per-track), and Admin.

---

## 5. Security Architecture

The platform implements defense-in-depth security across identity, networking, encryption, and observability layers.

### Network Isolation

- VPC (10.0.0.0/16) with two public subnets (ALB, NAT Gateway) and two private subnets (ECS, RDS) across two Availability Zones
- Security groups enforce strict chain: ALB accepts HTTPS (443) from internet, backend accepts traffic only from ALB on port 8000, RDS accepts PostgreSQL (5432) only from backend
- RDS security group restricts outbound to VPC CIDR only, preventing internet egress

### Identity and Access Management

- bcrypt password hashing with automatic salt generation
- JWT tokens signed with HS256 (access: 15 min, refresh: 7 days)
- JWT secret stored in AWS Secrets Manager, injected at runtime via IAM-scoped access
- Five-tier RBAC: Guest, User, Artist, Moderator, Admin
- Track-specific roles evaluated separately from global roles
- IAM policies follow least privilege (scoped ARNs, no wildcards)

### Encryption

- **At Rest:** AWS-managed KMS keys for RDS (AES-256), S3 buckets (SSE-S3), CloudTrail logs
- **In Transit:** TLS 1.2+ enforced via CloudFront viewer protocol policy, HSTS header with 1-year max-age

### Security Headers

Both FastAPI middleware and CloudFront enforce:
- `Content-Security-Policy` (default-src self, frame-src/script-src whitelist w.soundcloud.com)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` disabling camera, microphone, geolocation

### Web Application Firewall

AWS WAF attached to CloudFront and ALB with:
- AWSManagedRulesCommonRuleSet (XSS, path traversal, protocol violations)
- AWSManagedRulesSQLiRuleSet (SQL injection patterns)
- AWSManagedRulesKnownBadInputsRuleSet (Log4Shell, Spring4Shell)
- Custom rate-limiting rule (1,000 requests per 5 minutes per IP)
- Application-level rate limiter (5 failed logins per 60 seconds per IP)

### Audit Logging and Observability

- CloudTrail multi-region trail with log file validation
- Events delivered to encrypted S3 bucket and CloudWatch Logs (90-day retention)
- Application-level `audit_log` table records moderation/admin actions with actor ID, target, JSONB details, timestamp
- Paginated, filterable audit log API endpoint

### Input Validation

- Pydantic schemas validate all API inputs
- Email regex validation and lowercase normalization
- Password requirements: 8+ characters, 1 digit, 1 special character
- Post content capped at 5,000 characters
- SQL wildcards escaped in admin search queries

---

## 6. Infrastructure and Deployment

Terraform divides networking, compute, data, and security layers into reusable definitions. Docker, ECR, ECS, S3, and CloudFront enable repeatable deployment workflows. A standardized AWS CLI runbook ensures fresh-clone reproducibility.

See [DEPLOYMENT.md](DEPLOYMENT.md) for step-by-step deployment instructions.

---

## 7. Risks, Limitations, and Future Work

### Current Limitations

| Limitation | Description |
|------------|-------------|
| No MFA | JWT-only authentication, no second factor |
| Single RDS Instance | No read replicas or automatic failover |
| In-Memory Rate Limiter | Resets on container restart, not shared across ECS tasks (WAF provides reliable layer) |
| SoundCloud Dependency | Only supports SoundCloud URLs; latency depends on external oEmbed API |
| GuardDuty Unavailable | Requires paid subscription, disabled on free tier |
| No CI/CD Pipeline | Manual deployments via runbook |

### Future Enhancements

- GitHub Actions CI/CD pipeline with automated vulnerability scanning
- TOTP-based MFA for admin and optional for users
- Multi-platform support (Spotify, Bandcamp, Apple Music)
- Redis caching for oEmbed responses and distributed rate limiting
- SNS-based push notifications
- OAuth sign-in (Google, Apple, Discord)

---

## 8. References

- Amazon Web Services. (2024). AWS Well-Architected Framework: Security pillar.
- Amazon Web Services. (2024). Amazon ECS on AWS Fargate.
- Amazon Web Services. (2024). AWS WAF developer guide.
- Amazon Web Services. (2024). AWS CloudTrail user guide.
- HashiCorp. (2024). Terraform documentation.
- National Institute of Standards and Technology. (2020). NIST SP 800-53 Rev. 5.
- OWASP Foundation. (2021). OWASP Top Ten.
- SoundCloud. (2024). oEmbed API.
- Tiangolo, S. (2024). FastAPI documentation.
