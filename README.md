# SoundCloud Track Discussion Board

A secure, cloud-deployed web application for sharing and discussing SoundCloud tracks. Built with a focus on AWS cloud security — role-based access control, encryption, network segmentation, and compliance with NIST SP 800-53.

## Tech Stack

- **Frontend:** React 18, Vite, React Router, Axios
- **Backend:** Python 3.11, FastAPI, SQLAlchemy, Alembic
- **Database:** PostgreSQL 15
- **Infrastructure:** AWS (ECS Fargate, RDS, S3, CloudFront, Lambda, WAF)
- **IaC:** Terraform
- **Containerization:** Docker, Docker Compose
- **Auth:** JWT (PyJWT), bcrypt

## Project Documentation

All project docs are in the `docs/` folder:

- **REQUIREMENTS.md** — Full functional, non-functional, and security requirements
- **TASKS.md** — Task list broken into phases with assignments per team member
- **SoundCloud_Project_Roadmap.docx** — Overall roadmap with timeline, architecture, and RBAC model (In shared google drive)
- **design-document.md** — Design document (in progress)
- **compliance-checklist.md** — NIST SP 800-53 control mapping (in progress)
- **security-assessment.md** — Threat analysis and mitigations (in progress)

## Local Development Setup

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### Steps

1. Clone the repo: `git clone <your-repo-url>`
2. `cd 454-project`
3. Copy `.env.example` to `.env` (no changes needed for local dev)
4. `docker compose up --build`
5. Wait until all 3 services are running (you'll see "Application startup complete" and "VITE ready")
6. Frontend: http://localhost:3000
7. Backend health check: http://localhost:8000/api/health

To stop: `docker compose down`

## Team

| Name    | Role                 | Branch                  |
| ------- | -------------------- | ----------------------- |
| Sibi    | Infra Lead           | `feat/infra`            |
| Shyan   | Backend: Auth & RBAC | `feat/auth`             |
| Alyaan  | Backend: API & Data  | `feat/tracks-and-posts` |
| Dhuha   | Frontend             | `feat/frontend-core`    |
| Anthony | Security & Docs      | `feat/security-docs`    |

### Workflow

1. Work on your role's branch only
2. Check `docs/TASKS.md` for role specific tasks
3. PR into main when your work is ready — do not push to main directly
4. All PRs require one approval before merging
