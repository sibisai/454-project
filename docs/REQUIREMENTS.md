# SoundCloud Track Discussion Board — Requirements Document

## Project Overview

A cloud-hosted web application that lets users post SoundCloud tracks and have structured, threaded discussions underneath them — unlike SoundCloud's timeline-based comment system. Built with a focus on demonstrating AWS cloud security controls.

---

## Functional Requirements

### FR-1: User Accounts

- Users can register with email + password
- Passwords hashed with **bcrypt** before storage (never plaintext)
- Users can log in and receive a JWT token
- Users can log out (token invalidated client-side)
- Password complexity: minimum 8 characters, at least 1 number and 1 special character

### FR-2: Track Posting

- Authenticated users can submit a SoundCloud track URL
- Backend calls SoundCloud oEmbed endpoint (`https://soundcloud.com/oembed`) to fetch:
  - Track title
  - Artist name
  - Artwork thumbnail URL
  - Embeddable player HTML (iframe)
- Invalid or non-SoundCloud URLs are rejected with a clear error
- The user who posts a track is automatically assigned the **Artist** role for that track

### FR-3: Threaded Discussions

- Each submitted track has a dedicated discussion page
- Users can create top-level posts on any track
- Users can reply to any existing post (nested/threaded)
- Users can edit their own posts (with "edited" indicator)
- Users can delete their own posts
- Artists can pin/unpin posts on their own tracks
- Moderators can remove any post within their assigned tracks
- Admins can remove any post globally

### FR-4: Role-Based Access Control (5-Tier)

| Role      | Scope     | Permissions                                                                                      |
| --------- | --------- | ------------------------------------------------------------------------------------------------ |
| Guest     | Global    | Read-only. View tracks and discussions. No account needed.                                       |
| User      | Global    | All Guest + create posts, reply, edit/delete own posts.                                          |
| Artist    | Per-track | All User + pin/unpin comments on own tracks, delegate moderators for own tracks, verified badge. |
| Moderator | Per-track | All User + remove any post within assigned track(s). No power on unassigned tracks.              |
| Admin     | Global    | Full control: role management, user bans, audit log access, global moderation.                   |

**Delegation mechanic:** An Artist can promote any User to Moderator for a specific track. That Moderator's removal powers are scoped only to that track. An Artist can also revoke moderator status at any time.

### FR-5: Admin & Moderation

- Admin panel accessible only to Admin role
- Admin can: view all users, change roles, ban/unban users
- Audit log records all privileged actions immutably:
  - Post removals (who removed what, when)
  - User bans/unbans
  - Role changes (promotions, demotions, moderator delegations)
  - Admin login events
- Audit log viewable in admin panel with filtering by action type and date

### FR-6: Search & Browse

- Homepage shows recently posted tracks
- Users can search tracks by title or artist name

### FR-7: Discovery & Recommendations

- Discover page with curated track sections:
  - **Trending:** Tracks with most recent activity (posts, votes, likes)
  - **Recently Active:** Tracks with recent discussions
  - **New Arrivals:** Most recently posted tracks
  - **Personalized:** Collaborative filtering recommendations based on user activity
- Users can search for other users by display name

### FR-8: Engagement Features

- Users can like/unlike tracks
- Users can upvote/downvote posts
- Track and post engagement metrics displayed in UI

---

## Non-Functional Requirements

| ID    | Category        | Requirement                                                            |
| ----- | --------------- | ---------------------------------------------------------------------- |
| NFR-1 | Availability    | 99%+ uptime during demo window                                         |
| NFR-2 | Performance     | Page load under 3 seconds on standard Wi-Fi                            |
| NFR-3 | Reproducibility | Full local setup via `docker-compose up` with no external dependencies |
| NFR-4 | Observability   | Logs and security events viewable in AWS console                       |
| NFR-5 | IaC             | All AWS resources defined in Terraform (no manual console setup)       |

---

## Security Requirements

### Authentication & Session Management

- JWT tokens with short expiry (15 minutes access, 7 day refresh)
- JWT secret stored in AWS Secrets Manager (not hardcoded)
- Rate limiting on login endpoint (5 attempts per minute per IP)
- CSRF protection not needed (JWT in Authorization header, not cookies)

### Network & Infrastructure

- All resources inside a dedicated VPC
- Public subnet: ALB only
- Private subnets: ECS Fargate tasks + RDS
- Security Groups:
  - ALB SG: inbound 443 only
  - Backend SG: inbound from ALB SG only
  - RDS SG: inbound from Backend SG only (port 5432)
- HTTPS enforced everywhere (TLS 1.2+), HTTP redirected
- WAF on CloudFront and ALB

### Encryption

- In transit: TLS 1.2+ on all connections
- At rest: RDS encryption enabled, S3 SSE enabled
- S3: Block Public Access enabled

### IAM

- AWS root account never used for operations
- IAM roles (not static credentials) for all service access
- Least-privilege policies:
  - ECS task role: RDS + Secrets Manager access only
  - Lambda execution role: CloudWatch + SNS only
  - CI/CD role (if used): ECR + ECS deploy only
- MFA required for all IAM admin users

### Application Security

- Input validation on all endpoints (Pydantic models)
- SQL injection prevention via SQLAlchemy ORM
- Secure HTTP headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- No secrets in code or environment variables in repo (.gitignore enforced)

### Logging & Monitoring

- CloudTrail enabled for all API activity
- CloudWatch for application + infrastructure logs
- GuardDuty for automated threat detection
- Lambda-based alerts for:
  - Repeated failed logins (brute force detection)
  - IAM policy changes
- Log retention: 90 days minimum

---

## Tech Stack

| Layer                  | Technology                                   |
| ---------------------- | -------------------------------------------- |
| Frontend               | React (Vite) → S3 + CloudFront               |
| Backend                | Python FastAPI → Docker → ECS Fargate        |
| Database               | PostgreSQL → RDS (private subnet, encrypted) |
| Auth                   | Custom JWT + bcrypt                          |
| IaC                    | Terraform                                    |
| Containers             | Docker + docker-compose                      |
| Serverless             | AWS Lambda (audit + security alerts)         |
| SoundCloud Integration | oEmbed API (public, no key required)         |

---

## API Endpoints (Planned)

### Auth

- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Get JWT
- `POST /api/auth/refresh` — Refresh token

### Tracks

- `GET /api/tracks` — List recent tracks
- `GET /api/tracks/:id` — Get track + discussion
- `POST /api/tracks` — Submit SoundCloud URL (auth required)
- `GET /api/tracks/search?q=` — Search tracks

### Discussions

- `POST /api/tracks/:id/posts` — Create top-level post
- `POST /api/posts/:id/replies` — Reply to post
- `PUT /api/posts/:id` — Edit own post
- `DELETE /api/posts/:id` — Delete own post

### Artist Actions

- `POST /api/tracks/:id/pin/:postId` — Pin post (artist only)
- `DELETE /api/tracks/:id/pin/:postId` — Unpin post (artist only)
- `POST /api/tracks/:id/moderators/:userId` — Delegate moderator (artist only)
- `DELETE /api/tracks/:id/moderators/:userId` — Revoke moderator (artist only)

### Moderation

- `DELETE /api/mod/posts/:id` — Remove post (mod/admin)

### Track Engagement

- `POST /api/tracks/:id/like` — Like a track (auth required)
- `DELETE /api/tracks/:id/like` — Unlike a track (auth required)

### Post Engagement

- `POST /api/posts/:id/vote` — Vote on a post (upvote/downvote, auth required)
- `DELETE /api/posts/:id/vote` — Remove vote (auth required)

### Discovery

- `GET /api/discover/trending` — Trending tracks
- `GET /api/discover/recently-active` — Recently active discussions
- `GET /api/discover/new-arrivals` — Newest tracks
- `GET /api/discover/recommendations` — Personalized recommendations (auth required)

### User Profiles

- `GET /api/users/search?q=` — Search users by display name
- `GET /api/users/:id` — Get user public profile
- `GET /api/users/:id/tracks` — Get tracks posted by user
- `GET /api/users/:id/posts` — Get posts by user
- `GET /api/users/me/dashboard` — Current user's dashboard (auth required)

### Admin

- `GET /api/admin/users` — List all users
- `PUT /api/admin/users/:id/role` — Change user role
- `POST /api/admin/users/:id/ban` — Ban user
- `DELETE /api/admin/users/:id/ban` — Unban user
- `GET /api/admin/audit-log` — View audit log (filterable)
- `GET /api/admin/stats` — Platform statistics
- `GET /api/admin/analytics` — User activity analytics
- `GET /api/admin/top-tracks` — Most engaged tracks

---

## Database Schema (Planned)

### users

| Column        | Type         | Notes                             |
| ------------- | ------------ | --------------------------------- |
| id            | UUID         | Primary key                       |
| email         | VARCHAR(255) | Unique, indexed                   |
| password_hash | VARCHAR(255) | bcrypt hash                       |
| display_name  | VARCHAR(100) |                                   |
| global_role   | ENUM         | 'user', 'admin' (default: 'user') |
| is_banned     | BOOLEAN      | Default false                     |
| created_at    | TIMESTAMP    |                                   |

### tracks

| Column         | Type         | Notes                                                    |
| -------------- | ------------ | -------------------------------------------------------- |
| id             | UUID         | Primary key                                              |
| soundcloud_url | VARCHAR(500) | Original URL                                             |
| title          | VARCHAR(300) | From oEmbed                                              |
| artist_name    | VARCHAR(200) | From oEmbed                                              |
| artwork_url    | VARCHAR(500) | From oEmbed                                              |
| embed_html     | TEXT         | From oEmbed                                              |
| posted_by      | UUID         | FK → users.id (this user gets Artist role on this track) |
| created_at     | TIMESTAMP    |                                                          |

### posts

| Column     | Type      | Notes                              |
| ---------- | --------- | ---------------------------------- |
| id         | UUID      | Primary key                        |
| track_id   | UUID      | FK → tracks.id                     |
| author_id  | UUID      | FK → users.id                      |
| parent_id  | UUID      | FK → posts.id (NULL for top-level) |
| content    | TEXT      | Post body                          |
| is_pinned  | BOOLEAN   | Default false                      |
| is_removed | BOOLEAN   | Soft delete for mod removals       |
| removed_by | UUID      | FK → users.id (who removed it)     |
| created_at | TIMESTAMP |                                    |
| updated_at | TIMESTAMP | NULL if never edited               |

### track_moderators

| Column       | Type                | Notes                      |
| ------------ | ------------------- | -------------------------- |
| track_id     | UUID                | FK → tracks.id             |
| user_id      | UUID                | FK → users.id              |
| delegated_by | UUID                | FK → users.id (the artist) |
| created_at   | TIMESTAMP           |                            |
| PRIMARY KEY  | (track_id, user_id) |                            |

### audit_log

| Column      | Type        | Notes                                                                |
| ----------- | ----------- | -------------------------------------------------------------------- |
| id          | UUID        | Primary key                                                          |
| actor_id    | UUID        | FK → users.id                                                        |
| action      | VARCHAR(50) | 'post_removed', 'user_banned', 'role_changed', 'mod_delegated', etc. |
| target_type | VARCHAR(50) | 'post', 'user', 'track'                                              |
| target_id   | UUID        | ID of affected resource                                              |
| details     | JSONB       | Additional context                                                   |
| created_at  | TIMESTAMP   | Immutable                                                            |

### track_likes

| Column      | Type                | Notes          |
| ----------- | ------------------- | -------------- |
| track_id    | UUID                | FK → tracks.id |
| user_id     | UUID                | FK → users.id  |
| created_at  | TIMESTAMP           |                |
| PRIMARY KEY | (track_id, user_id) |                |

### post_votes

| Column      | Type               | Notes                    |
| ----------- | ------------------ | ------------------------ |
| post_id     | UUID               | FK → posts.id            |
| user_id     | UUID               | FK → users.id            |
| vote_type   | ENUM               | 'upvote', 'downvote'     |
| created_at  | TIMESTAMP          |                          |
| PRIMARY KEY | (post_id, user_id) |                          |

---

## Compliance Mapping (NIST SP 800-53)

| Control ID | Requirement                  | How We Address It                                 |
| ---------- | ---------------------------- | ------------------------------------------------- |
| AC-2       | Account Management           | 5-tier RBAC, registration, ban/deprovisioning     |
| AC-6       | Least Privilege              | Scoped IAM roles, per-track moderator permissions |
| IA-5       | Authenticator Management     | bcrypt hashing, password complexity rules         |
| SC-8       | Transmission Confidentiality | TLS 1.2+ everywhere, HTTPS-only                   |
| SC-28      | Protection at Rest           | RDS encryption, S3 SSE                            |
| AU-2       | Event Logging                | CloudTrail, CloudWatch, audit_log table           |
| SI-3       | Malicious Code Protection    | pip-audit, Trivy, OWASP ZAP scans                 |
| SA-11      | Developer Security Testing   | OWASP ZAP dynamic scan on all endpoints           |
