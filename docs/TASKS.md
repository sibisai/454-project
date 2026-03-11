# Task List — SoundCloud Track Discussion Board

> **Timeline:** Mar 9 – May 10, 2026 (9 weeks)
> **Team:** 5 members — assign names below

| Role                            | Name    |
| ------------------------------- | ------- |
| Infra Lead (Member 1)           | Sibi    |
| Backend: Auth & RBAC (Member 2) | Shyan   |
| Backend: API & Data (Member 3)  | Alyaan  |
| Frontend (Member 4)             | Dhuha   |
| Security & Docs (Member 5)      | Anthony |

---

## Phase 1: Foundation — Mar 9–22

### Infra Lead

- [x] Create repo with folder structure (see below)
- [x] Write `docker-compose.yml` (FastAPI + PostgreSQL + React)
- [ ] Terraform: VPC with 2 AZs, public + private subnets
- [ ] Terraform: Security Groups (ALB, backend, RDS)
- [ ] Terraform: RDS PostgreSQL (private subnet, encrypted)
- [ ] Terraform: ECR repository for backend Docker image
- [ ] Verify: VPC visible in AWS console, RDS accessible from private subnet only

### Backend: Auth & RBAC

- [ ] FastAPI project scaffold (`backend/app/main.py`)
- [ ] User model (SQLAlchemy)
- [ ] `POST /api/auth/register` — validate input, hash with bcrypt, store user
- [ ] `POST /api/auth/login` — verify credentials, return JWT
- [ ] JWT middleware — decode token, attach user to request
- [ ] Verify: can register, login, and hit a protected test endpoint

### Backend: API & Data

- [ ] Full DB schema in SQLAlchemy models (users, tracks, posts, track_moderators, audit_log)
- [ ] Alembic setup + initial migration
- [ ] oEmbed service: fetch metadata from `https://soundcloud.com/oembed?format=json&url=`
- [ ] URL validation (must be a valid soundcloud.com URL)
- [ ] Verify: schema deployed to local PostgreSQL, oEmbed returns track data

### Frontend

- [ ] React + Vite scaffold (`frontend/`)
- [ ] Routing setup (React Router): home, login, register, track detail
- [ ] Login page — form, call `/api/auth/login`, store JWT
- [ ] Register page — form, call `/api/auth/register`
- [ ] Basic layout: nav bar with login/logout state
- [ ] Verify: can log in and see authenticated state in UI

### Security & Docs

- [ ] Terraform: CloudTrail (log to S3 + CloudWatch)
- [ ] Terraform: CloudWatch log groups
- [ ] Start design document: Sections 1–3 (Background, System Requirements, Security Requirements)
- [ ] Verify: CloudTrail logging visible in AWS console

---

## Phase 2: Core Features — Mar 23–Apr 5

### Infra Lead

- [ ] Terraform: ECS Fargate cluster + task definition
- [ ] Terraform: ALB (HTTPS listener, TLS cert via ACM)
- [ ] Terraform: S3 bucket for React frontend (Block Public Access on)
- [ ] Terraform: CloudFront distribution (OAI to S3, HTTPS-only)
- [ ] Backend Dockerfile → push to ECR → deploy to ECS
- [ ] Frontend build → upload to S3 → invalidate CloudFront
- [ ] Verify: app reachable via HTTPS through CloudFront/ALB

### Backend: Auth & RBAC

- [ ] Role-based permission middleware (checks global_role + track-specific roles)
- [ ] Permission decorator/dependency: `require_role("admin")`, `require_track_role(track_id, "moderator")`
- [ ] `GET /api/admin/users` — list users (admin only)
- [ ] `PUT /api/admin/users/:id/role` — change global role (admin only)
- [ ] Verify: non-admin gets 403 on admin endpoints

### Backend: API & Data

- [ ] `POST /api/tracks` — submit URL, fetch oEmbed, auto-assign Artist role to poster
- [ ] `GET /api/tracks` — list recent tracks (paginated)
- [ ] `GET /api/tracks/:id` — get track + its discussion posts
- [ ] `POST /api/tracks/:id/posts` — create top-level post
- [ ] `POST /api/posts/:id/replies` — reply to post
- [ ] `PUT /api/posts/:id` — edit own post
- [ ] `DELETE /api/posts/:id` — delete own post
- [ ] Verify: full flow works — post track, create thread, reply, edit, delete

### Frontend

- [ ] Home page: list of recent tracks with artwork + title + artist
- [ ] Track submission page: URL input, preview oEmbed data before posting
- [ ] Track detail page: embedded SoundCloud player + discussion thread
- [ ] Threaded reply UI (nested comments, 2–3 levels deep)
- [ ] Edit/delete buttons on own posts
- [ ] Verify: full track → discussion flow working end-to-end in browser

### Security & Docs

- [ ] Terraform: WAF rules on CloudFront (rate limiting, SQLi, XSS)
- [ ] Terraform: WAF rules on ALB
- [ ] Continue design document: Section 4 (Architecture Diagram)
- [ ] Start compliance checklist draft (Section 6)
- [ ] Verify: WAF active, SQL injection request blocked

---

## Phase 3: RBAC + Security Hardening — Apr 6–19

### Infra Lead

- [ ] Terraform: Secrets Manager (DB credentials + JWT secret)
- [ ] Update ECS task definition to pull secrets from Secrets Manager
- [ ] Terraform: IAM task role for ECS (least privilege: RDS + Secrets Manager only)
- [ ] Terraform: GuardDuty enabled
- [ ] Review all IAM policies — remove any wildcard (`*`) actions
- [ ] Verify: no hardcoded secrets, IAM policies scoped per service

### Backend: Auth & RBAC

- [ ] Auto-assign Artist role when user posts a track
- [ ] `POST /api/tracks/:id/moderators/:userId` — artist delegates moderator
- [ ] `DELETE /api/tracks/:id/moderators/:userId` — artist revokes moderator
- [ ] Scoped permission check: moderator can only act on their assigned tracks
- [ ] `POST /api/auth/refresh` — refresh token endpoint
- [ ] Verify: artist can delegate mod, mod power scoped to that track only

### Backend: API & Data

- [ ] `DELETE /api/mod/posts/:id` — moderator/admin removes post (soft delete)
- [ ] `POST /api/admin/users/:id/ban` — ban user (admin only)
- [ ] `DELETE /api/admin/users/:id/ban` — unban user (admin only)
- [ ] `POST /api/tracks/:id/pin/:postId` — pin post (artist only)
- [ ] `DELETE /api/tracks/:id/pin/:postId` — unpin post (artist only)
- [ ] Audit log: record all mod/admin actions to audit_log table
- [ ] `GET /api/admin/audit-log` — filterable audit log (admin only)
- [ ] Rate limiting on `/api/auth/login` (5/min per IP)
- [ ] Verify: all mod actions logged, rate limiting active

### Frontend

- [ ] Artist dashboard on track detail page: pin button, "manage moderators" panel
- [ ] Moderator tools: "remove post" button visible only on assigned tracks
- [ ] Admin panel page: user list, role change dropdown, ban/unban buttons
- [ ] Admin audit log viewer with action type and date filters
- [ ] Conditional UI: only show tools the user's role allows
- [ ] Verify: each role sees only their permitted actions

### Security & Docs

- [ ] Lambda: audit log processor (triggered by CloudWatch events)
- [ ] Lambda: failed login alerter (>5 failures → SNS notification)
- [ ] Terraform: Lambda functions + execution roles (least privilege)
- [ ] Add secure headers middleware to FastAPI (CSP, HSTS, X-Frame-Options)
- [ ] HTTPS redirect: all HTTP → HTTPS
- [ ] Verify: Lambda functions deployed and triggering correctly

---

## Phase 4: Testing & Scanning — Apr 20–May 3

### Infra Lead

- [ ] Full Terraform review: no public DB, no wildcard IAM, encryption confirmed
- [ ] `terraform destroy` + `terraform apply` — confirm clean deploy works
- [ ] `docker-compose up` — confirm full local stack works from scratch
- [ ] Write README.md setup guide (local + AWS deployment steps)
- [ ] Verify: a teammate can clone repo + `docker-compose up` and it works

### Backend: Auth & RBAC

- [ ] Test permission boundaries: user can't access admin, mod can't act on wrong track
- [ ] Test role escalation prevention: user can't promote themselves
- [ ] Test banned user can't log in or post
- [ ] Test JWT expiry and refresh flow
- [ ] Verify: all permission tests pass, no bypass found

### Backend: API & Data

- [ ] Test invalid SoundCloud URLs rejected
- [ ] Test editing/deleting posts by wrong user returns 403
- [ ] Test threaded replies maintain correct nesting
- [ ] Test audit log captures all expected actions
- [ ] Verify: all endpoints return correct status codes

### Frontend

- [ ] Test all role-specific UI (log in as each role, confirm correct view)
- [ ] Error states: invalid URL, network error, unauthorized
- [ ] Loading states on all async actions
- [ ] Basic mobile responsiveness
- [ ] Verify: no broken UI states across roles

### Security & Docs

- [ ] Run OWASP ZAP scan against deployed app
- [ ] Run Trivy scan on backend Docker image
- [ ] Run pip-audit on Python dependencies
- [ ] Document minimum 3 findings with severity + remediation
- [ ] Complete design document (all sections)
- [ ] Complete compliance checklist with evidence links
- [ ] Complete security assessment (3–5 threats, Section 7)
- [ ] Verify: scan reports saved, all high/critical findings remediated

---

## Phase 5: Polish & Present — May 4–10

### Everyone

- [ ] Capture all required screenshots:
  - [ ] VPC + subnets in AWS console
  - [ ] Security Group rules (ALB, backend, RDS)
  - [ ] RDS encryption status
  - [ ] S3 bucket policy (SSE + Block Public Access)
  - [ ] CloudTrail active
  - [ ] Application running via HTTPS
  - [ ] Discussion thread working (end-to-end)
  - [ ] Vulnerability scan results
- [ ] Assign presentation segments (15–20 min total)
- [ ] Rehearse presentation at least once

### Infra Lead

- [ ] Finalize README.md
- [ ] Confirm `terraform destroy` / `terraform apply` still clean
- [ ] Pre-open AWS console tabs for demo (VPC, IAM, RDS, CloudTrail)

### Frontend

- [ ] Record backup demo video (screen recording of full flow)
- [ ] Final UI polish

### Security & Docs

- [ ] Finalize all documentation files
- [ ] Print/export compliance checklist with evidence mapped
- [ ] Prepare 2–3 pre-cached sample tracks in case oEmbed is slow during demo

---

## Repo Structure

```
soundcloud-discuss/
├── terraform/
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── vpc.tf
│   ├── rds.tf
│   ├── ecs.tf
│   ├── s3-cloudfront.tf
│   ├── lambda.tf
│   ├── waf.tf
│   └── iam.tf
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── auth/
│   │   │   ├── routes.py
│   │   │   ├── jwt.py
│   │   │   └── passwords.py
│   │   ├── routes/
│   │   │   ├── tracks.py
│   │   │   ├── posts.py
│   │   │   ├── admin.py
│   │   │   └── moderation.py
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── track.py
│   │   │   ├── post.py
│   │   │   └── audit.py
│   │   ├── middleware/
│   │   │   ├── rbac.py
│   │   │   ├── rate_limit.py
│   │   │   └── security_headers.py
│   │   └── services/
│   │       ├── oembed.py
│   │       └── audit.py
│   ├── alembic/
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── App.jsx
│   ├── Dockerfile
│   └── package.json
├── lambda/
│   ├── audit_processor/
│   │   └── handler.py
│   └── security_alert/
│       └── handler.py
├── docs/
│   ├── design-document.md
│   ├── compliance-checklist.md
│   ├── security-assessment.md
│   └── screenshots/
├── docker-compose.yml
├── .gitignore
├── .env.example
└── README.md
```

---

## Weekly Standup

Every **Monday** — 15 minutes max. Each person answers:

1. What did I finish last week?
2. What am I doing this week?
3. Am I blocked on anything?

Track blockers immediately. Don't wait for standup.
