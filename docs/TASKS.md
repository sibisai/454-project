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
- [ ] Verify: VPC visible in AWS console, RDS accessible from private subnet only

### Backend: Auth & RBAC (Shyan)

- [ ] User model (SQLAlchemy)
- [ ] `POST /api/auth/register` — validate input, hash with bcrypt, store user
- [ ] `POST /api/auth/login` — verify credentials, return JWT
- [ ] JWT middleware — decode token, attach user to request
- [ ] `GET /api/auth/me` — return current user from token
- [ ] Verify: can register, login, and hit a protected test endpoint

### Backend: API & Data (Alyaan)

- [ ] Full DB schema in SQLAlchemy models (users, tracks, posts, track_moderators, audit_log)
- [ ] Alembic setup + initial migration
- [ ] oEmbed service: fetch metadata from `https://soundcloud.com/oembed?format=json&url=`
- [ ] URL validation (must be a valid soundcloud.com URL)
- [ ] Verify: schema deployed to local PostgreSQL, oEmbed returns track data

### Frontend (Dhuha)

- [ ] Routing setup (React Router): home, login, register, track detail
- [ ] Login page — form, call `/api/auth/login`, store JWT
- [ ] Register page — form, call `/api/auth/register`
- [ ] Basic layout: nav bar with login/logout state
- [ ] Verify: can log in and see authenticated state in UI

### Security & Docs (Anthony)

- [ ] Start design document: Sections 1–3 (Background, System Requirements, Security Requirements)
- [ ] Start compliance checklist draft

---

## Phase 2: Core Features — Mar 23–30

### Infra (Sibi)

- [ ] Terraform: ECS Fargate cluster + task definition
- [ ] Terraform: ALB (HTTPS listener, TLS cert via ACM)
- [ ] Terraform: S3 bucket for React frontend (Block Public Access on)
- [ ] Terraform: CloudFront distribution (OAI to S3, HTTPS-only)
- [ ] Backend Dockerfile → push to ECR → deploy to ECS
- [ ] Frontend build → upload to S3 → invalidate CloudFront
- [ ] Verify: app reachable via HTTPS through CloudFront/ALB

### Backend: Auth & RBAC

- [ ] Role-based permission middleware (checks global_role + track-specific roles)
- [ ] Permission dependency: `require_role("admin")`, `require_track_role(track_id, "moderator")`
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

### Security & Docs (Anthony)

- [ ] Continue design document: Section 4 (Architecture Diagram)
- [ ] Continue compliance checklist (Section 6)

---

## Phase 3: RBAC + Security Hardening — Mar 31–Apr 6

### Infra (Sibi)

- [ ] Terraform: Secrets Manager (DB credentials + JWT secret)
- [ ] Update ECS task definition to pull secrets from Secrets Manager
- [ ] Terraform: IAM task role for ECS (least privilege: RDS + Secrets Manager only)
- [ ] Terraform: GuardDuty enabled
- [ ] Terraform: WAF rules on CloudFront + ALB (rate limiting, SQLi, XSS)
- [ ] Terraform: Lambda functions + execution roles (least privilege)
- [ ] Review all IAM policies — remove any wildcard (`*`) actions
- [ ] Verify: no hardcoded secrets, IAM policies scoped per service

### Backend: RBAC

- [ ] Auto-assign Artist role when user posts a track
- [ ] `POST /api/tracks/:id/moderators/:userId` — artist delegates moderator
- [ ] `DELETE /api/tracks/:id/moderators/:userId` — artist revokes moderator
- [ ] Scoped permission check: moderator can only act on their assigned tracks
- [ ] `POST /api/auth/refresh` — refresh token endpoint
- [ ] Verify: artist can delegate mod, mod power scoped to that track only

### Backend: Moderation + Admin

- [ ] `DELETE /api/mod/posts/:id` — moderator/admin removes post (soft delete)
- [ ] `POST /api/admin/users/:id/ban` — ban user (admin only)
- [ ] `DELETE /api/admin/users/:id/ban` — unban user (admin only)
- [ ] `POST /api/tracks/:id/pin/:postId` — pin post (artist only)
- [ ] `DELETE /api/tracks/:id/pin/:postId` — unpin post (artist only)
- [ ] Audit log: record all mod/admin actions to audit_log table
- [ ] `GET /api/admin/audit-log` — filterable audit log (admin only)
- [ ] Rate limiting on `/api/auth/login` (5/min per IP)
- [ ] Verify: all mod actions logged, rate limiting active

### Frontend: Role-Based UI

- [ ] Artist tools on track detail: pin button, "manage moderators" panel
- [ ] Moderator tools: "remove post" button visible only on assigned tracks
- [ ] Admin panel: user list, role change dropdown, ban/unban buttons
- [ ] Admin audit log viewer with action type and date filters
- [ ] Conditional UI: only show tools the user's role allows
- [ ] Verify: each role sees only their permitted actions

### Security & Docs (Anthony)

- [ ] Lambda: audit log processor code
- [ ] Lambda: failed login alerter code
- [ ] Secure headers middleware for FastAPI (CSP, HSTS, X-Frame-Options)
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

- [ ] Run OWASP ZAP scan against deployed app
- [ ] Run Trivy scan on backend Docker image
- [ ] Run pip-audit on Python dependencies
- [ ] Document minimum 3 findings with severity + remediation
- [ ] Fix high/critical findings and rescan
- [ ] Verify: scan reports saved, findings documented

### Frontend Polish

- [ ] Error states: invalid URL, network error, unauthorized
- [ ] Loading states on all async actions
- [ ] Basic mobile responsiveness
- [ ] Test all role-specific UI
- [ ] Verify: no broken UI states

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
