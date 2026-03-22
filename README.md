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
- **design-document.md** — Design document (placeholder)
- **compliance-checklist.md** — NIST SP 800-53 control mapping (placeholder)
- **security-assessment.md** — Threat analysis and mitigations (placeholder)

## Local Development Setup

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### Steps

1. Clone the repo: `git clone <your-repo-url>`
2. `cd 454-project`
3. `docker compose up --build`
4. Wait until all 3 services are running (you'll see "Application startup complete" and "VITE ready")
5. Frontend: http://localhost:3000
6. Backend health check: http://localhost:8000/api/health

To stop: `docker compose down`

## AWS Infrastructure

All AWS resources are defined in Terraform under the `terraform/` directory. See `docs/` for architecture details.

## Team

| Name    | Role                 |
| ------- | -------------------- |
| Sibi    | Infra Lead           |
| Shyan   | Backend: Auth & RBAC |
| Alyaan  | Backend: API & Data  |
| Dhuha   | Frontend             |
| Anthony | Security & Docs      |
