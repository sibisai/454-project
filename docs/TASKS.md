# Task List — SoundCloud Track Discussion Board

> **Presentation:** April 16–17, 2026
> **Timeline:** Mar 9 – Apr 16 (~5.5 weeks)
> **Team:** 5 members

| Role                 | Name    |
| -------------------- | ------- |
| Infra Lead           | Sibi    |
| Backend: Auth & RBAC | Shyan   |
| Backend: API & Data  | Alyaan  |
| Frontend             | Dhuha   |
| Security & Docs      | Anthony |

---

## Phase 1: Foundation — Mar 9–22

### Infra Lead (Sibi)

- [x] Create repo with folder structure
- [x] Write `docker-compose.yml` (FastAPI + PostgreSQL + React)
- [x] Terraform: VPC with 2 AZs, public + private subnets
- [x] Terraform: Security Groups (ALB, backend, RDS)
- [x] Terraform: RDS PostgreSQL (private subnet, encrypted)
- [x] Terraform: ECR repository for backend Docker image
- [x] Terraform: CloudTrail + CloudWatch log groups
- [x] Terraform: cleanup and validation
- [x] Verify: VPC visible in AWS console, RDS accessible from private subnet only

### Backend: Auth & RBAC (Shyan)

- [x] User model (SQLAlchemy)
- [x] `POST /api/auth/register` — validate input, hash with bcrypt, store user
- [x] `POST /api/auth/login` — verify credentials, return JWT
- [x] JWT middleware — decode token, attach user to request
- [x] `GET /api/auth/me` — return current user from token
- [x] Verify: can register, login, and hit a protected test endpoint

### Backend: API & Data (Alyaan)

- [x] Full DB schema in SQLAlchemy models (users, tracks, posts, track_moderators, audit_log)
- [x] Alembic setup + initial migration
- [x] oEmbed service: fetch metadata from `https://soundcloud.com/oembed?format=json&url=`
- [x] URL validation (must be a valid soundcloud.com URL)
- [x] Verify: schema deployed to local PostgreSQL, oEmbed returns track data

### Frontend (Dhuha)

- [x] Routing setup (React Router): home, login, register, track detail
- [x] Login page — form, call `/api/auth/login`, store JWT
- [x] Register page — form, call `/api/auth/register`
- [x] Basic layout: nav bar with login/logout state
- [x] Verify: can log in and see authenticated state in UI

### Security & Docs (Anthony)

- [ ] Start design document: Sections 1–3 (Background, System Requirements, Security Requirements)
- [ ] Start compliance checklist draft

---

## Phase 2: Core Features — Mar 23–30

### Infra (Sibi)

- [x] Terraform: ECS Fargate cluster + task definition
- [x] Terraform: ALB (HTTPS listener, TLS cert via ACM)
- [x] Terraform: S3 bucket for React frontend (Block Public Access on)
- [x] Terraform: CloudFront distribution (OAI to S3, HTTPS-only)
- [x] Backend Dockerfile → push to ECR → deploy to ECS
- [x] Frontend build → upload to S3 → invalidate CloudFront
- [x] Verify: app reachable via HTTPS through CloudFront/ALB

### Backend: Auth & RBAC

- [x] Role-based permission middleware (checks global_role + track-specific roles)
- [x] Permission dependency: `require_role("admin")`, `require_track_role(track_id, "moderator")`
- [x] `GET /api/admin/users` — list users (admin only)
- [x] `PUT /api/admin/users/:id/role` — change global role (admin only)
- [x] Verify: non-admin gets 403 on admin endpoints

### Backend: API & Data

- [x] `POST /api/tracks` — submit URL, fetch oEmbed, auto-assign Artist role to poster
- [x] `GET /api/tracks` — list recent tracks (paginated)
- [x] `GET /api/tracks/:id` — get track + its discussion posts
- [x] `POST /api/tracks/:id/posts` — create top-level post
- [x] `POST /api/posts/:id/replies` — reply to post
- [x] `PUT /api/posts/:id` — edit own post
- [x] `DELETE /api/posts/:id` — delete own post
- [x] Verify: full flow works — post track, create thread, reply, edit, delete

### Frontend

- [x] Home page: list of recent tracks with artwork + title + artist
- [x] Track submission page: URL input, preview oEmbed data before posting
- [x] Track detail page: embedded SoundCloud player + discussion thread
- [x] Threaded reply UI (nested comments, 2–3 levels deep)
- [x] Edit/delete buttons on own posts
- [x] Verify: full track → discussion flow working end-to-end in browser

### Security & Docs (Anthony)

- [ ] Continue design document: Section 4 (Architecture Diagram)
- [ ] Continue compliance checklist (Section 6)

---

## Phase 3: RBAC + Security Hardening — Mar 31–Apr 6

### Infra (Sibi)

- [x] Terraform: Secrets Manager (DB credentials + JWT secret)
- [x] Update ECS task definition to pull secrets from Secrets Manager
- [x] Terraform: IAM task role for ECS (least privilege: RDS + Secrets Manager only)
- [x] Terraform: GuardDuty enabled
- [x] Terraform: WAF rules on CloudFront + ALB (rate limiting, SQLi, XSS)
- [x] Terraform: Lambda functions + execution roles (least privilege)
- [x] Review all IAM policies — remove any wildcard (`*`) actions
- [x] Verify: no hardcoded secrets, IAM policies scoped per service

### Backend: RBAC

- [x] Auto-assign Artist role when user posts a track
- [x] `POST /api/tracks/:id/moderators/:userId` — artist delegates moderator
- [x] `DELETE /api/tracks/:id/moderators/:userId` — artist revokes moderator
- [x] Scoped permission check: moderator can only act on their assigned tracks
- [x] `POST /api/auth/refresh` — refresh token endpoint
- [x] Verify: artist can delegate mod, mod power scoped to that track only

### Backend: Moderation + Admin

- [x] `DELETE /api/mod/posts/:id` — moderator/admin removes post (soft delete)
- [x] `POST /api/admin/users/:id/ban` — ban user (admin only)
- [x] `DELETE /api/admin/users/:id/ban` — unban user (admin only)
- [x] `POST /api/tracks/:id/pin/:postId` — pin post (artist only)
- [x] `DELETE /api/tracks/:id/pin/:postId` — unpin post (artist only)
- [x] Audit log: record all mod/admin actions to audit_log table
- [x] `GET /api/admin/audit-log` — filterable audit log (admin only)
- [x] Rate limiting on `/api/auth/login` (5/min per IP)
- [x] Verify: all mod actions logged, rate limiting active

### Frontend: Role-Based UI

- [x] Artist tools on track detail: pin button, "manage moderators" panel
- [x] Moderator tools: "remove post" button visible only on assigned tracks
- [x] Admin panel: user list, role change dropdown, ban/unban buttons
- [x] Admin audit log viewer with action type and date filters
- [x] Conditional UI: only show tools the user's role allows
- [x] Verify: each role sees only their permitted actions

### Security & Docs (Anthony)

- [ ] Lambda: audit log processor code
- [ ] Lambda: failed login alerter code
- [x] Secure headers middleware for FastAPI (CSP, HSTS, X-Frame-Options)
- [ ] Continue design document: Sections 5–7

---

## Phase 4: Testing, Scanning & Polish — Apr 7–13

### Testing

- [ ] Full Terraform review: no public DB, no wildcard IAM, encryption confirmed
- [ ] `terraform destroy` + `terraform apply` — confirm clean deploy works
- [ ] `docker-compose up` from fresh clone — confirm works
- [ ] Test permission boundaries: user can't access admin, mod can't act on wrong track
- [ ] Test role escalation prevention
- [ ] Test banned user can't log in or post
- [ ] Test JWT expiry and refresh flow
- [ ] Test invalid SoundCloud URLs rejected
- [ ] Test edit/delete posts by wrong user returns 403
- [ ] Test threaded replies maintain correct nesting
- [ ] Test audit log captures all expected actions
- [ ] Verify: all endpoints return correct status codes

### Vulnerability Scanning

- [x] Run OWASP ZAP scan against deployed app
- [x] Run Trivy scan on backend Docker image
- [x] Run pip-audit on Python dependencies
- [x] Document minimum 3 findings with severity + remediation
- [x] Fix high/critical findings and rescan
- [x] Verify: scan reports saved, findings documented

### Frontend Polish

- [x] Error states: invalid URL, network error, unauthorized
- [x] Loading states on all async actions
- [x] Basic mobile responsiveness
- [x] Test all role-specific UI
- [x] Verify: no broken UI states

### Documentation (Anthony)

- [ ] Complete design document (all sections, 6–8 pages)
- [ ] Complete compliance checklist with evidence links
- [ ] Complete security assessment (3–5 threats, Section 7)
- [ ] Verify: all docs ready for submission

---

## Phase 5: Present — Apr 14–17

### Screenshots

- [ ] VPC + subnets in AWS console
- [ ] Security Group rules (ALB, backend, RDS)
- [ ] RDS encryption status
- [ ] S3 bucket policy (SSE + Block Public Access)
- [ ] CloudTrail active
- [ ] Application running via HTTPS
- [ ] Discussion thread working (end-to-end)
- [ ] Vulnerability scan results

### Presentation Prep

- [ ] Build presentation slides
- [ ] Assign segments (15–20 min total)
- [ ] Rehearse at least once
- [ ] Pre-open AWS console tabs for demo
- [ ] Pre-cache 2–3 sample SoundCloud tracks for demo
- [ ] Record backup demo video
- [ ] Finalize README.md with full setup instructions

### PRESENT: April 16–17

---

## Repo Structure

```
454-project/
├── terraform/
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── terraform.tfvars.example
│   ├── vpc.tf
│   ├── security-groups.tf
│   ├── rds.tf
│   ├── ecs.tf
│   ├── s3-cloudfront.tf
│   ├── lambda.tf
│   ├── waf.tf
│   ├── iam.tf
│   └── cloudtrail.tf
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── seed_admin.py
│   │   ├── auth/
│   │   │   ├── routes.py
│   │   │   ├── schemas.py
│   │   │   ├── jwt.py
│   │   │   └── passwords.py
│   │   ├── routes/
│   │   │   ├── tracks.py
│   │   │   ├── posts.py
│   │   │   ├── admin.py
│   │   │   ├── moderation.py
│   │   │   ├── discover.py
│   │   │   ├── users.py
│   │   │   ├── helpers.py
│   │   │   └── schemas.py
│   │   ├── models/
│   │   │   ├── base.py
│   │   │   ├── user.py
│   │   │   ├── track.py
│   │   │   ├── post.py
│   │   │   ├── like.py
│   │   │   └── audit.py
│   │   ├── middleware/
│   │   │   ├── rbac.py
│   │   │   ├── rate_limit.py
│   │   │   └── security_headers.py
│   │   └── services/
│   │       ├── oembed.py
│   │       └── audit.py
│   ├── alembic/
│   ├── alembic.ini
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   ├── Dockerfile
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       ├── services/
│       └── utils/
├── lambda/
│   ├── audit_processor/
│   │   └── handler.py
│   └── security_alert/
│       └── handler.py
├── docs/
│   ├── REQUIREMENTS.md
│   ├── TASKS.md
│   ├── design-document.md
│   ├── compliance-checklist.md
│   ├── security-assessment.md
│   └── screenshots/
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```
