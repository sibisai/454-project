# SoundBoard — AWS Deployment Guide

Step-by-step instructions to deploy SoundBoard from a fresh clone to a running app on AWS.

**Estimated time:** 20-30 minutes

**Estimated cost:** ~$1-2/day while running (remember to destroy after testing)

---

## Prerequisites

Install these tools first:

```bash
# macOS (via Homebrew)
brew install terraform awscli docker node

# Verify
terraform version    # >= 1.5
aws --version        # >= 2.x
docker --version     # >= 20.x
node --version       # >= 18.x
```

You'll also need:
- An AWS account with admin access
- Docker Desktop running (needed for the build step)

---

## Step 1: Configure AWS CLI

```bash
aws configure
# AWS Access Key ID: <your key>
# AWS Secret Access Key: <your secret>
# Default region: us-east-1
# Default output format: json

# Verify it works
aws sts get-caller-identity
```

---

## Step 2: Clone and set up the repo

```bash
git clone https://github.com/sibisai/454-project.git
cd 454-project
```

---

## Step 3: Create Terraform variables file

```bash
cd terraform

# Generate a random JWT secret
openssl rand -hex 32
# Copy the output - you'll paste it below
```

Create `terraform.tfvars` (this file is gitignored):

```bash
cat > terraform.tfvars << 'EOF'
db_username = "soundboard_admin"
db_password = "ChangeMe_SecurePass2026"
jwt_secret  = "PASTE_THE_OPENSSL_OUTPUT_HERE"
EOF
```

> **Note:** Don't use special characters like `!` in the password — shells interpret them. Password must be at least 8 characters.
>
> **Note:** Don't use `admin`, `postgres`, or other [PostgreSQL reserved words](https://www.postgresql.org/docs/15/sql-keywords-appendix.html) as the `db_username` — RDS will reject them.

---

## Step 4: Provision AWS infrastructure

```bash
# Download providers
terraform init

# Preview what will be created (should show ~60 resources)
terraform plan

# Create everything - takes 8-12 minutes (RDS and CloudFront are slowest)
terraform apply
# Type: yes

# Save the outputs - you'll need them for the next steps
terraform output
```

The remaining steps pull these values automatically via `terraform output`.

---

## Step 5: Build and push the backend Docker image

> **Note:** On Linux, docker commands may require `sudo` (e.g., `sudo docker build ...`). On macOS with Docker Desktop, `sudo` is not needed. If you use `sudo` for one docker command, you must use it for ALL docker commands (login, build, tag, push) — otherwise auth credentials won't be shared between `sudo` and non-`sudo` Docker.

```bash
cd ..  # back to project root (must be in 454-project/, NOT terraform/)

# Login to ECR (credentials expire after 12 hours)
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  $(cd terraform && terraform output -raw ecr_repository_url | cut -d'/' -f1)

# Build the Docker image
# --platform linux/amd64 is CRITICAL on Apple Silicon Macs (M1/M2/M3)
# On x86 Linux (e.g., Fedora, Ubuntu) you can omit the --platform flag
docker build --platform linux/amd64 -t soundcloud-discuss-backend ./backend

# Tag for ECR
ECR_URL=$(cd terraform && terraform output -raw ecr_repository_url)
docker tag soundcloud-discuss-backend:latest $ECR_URL:latest

# Push to ECR
docker push $ECR_URL:latest

# Tell ECS to pull the new image and restart the container
aws ecs update-service \
  --cluster soundcloud-discuss-cluster \
  --service soundcloud-discuss-backend-service \
  --force-new-deployment \
  --region us-east-1
```

---

## Step 6: Wait for ECS to start the container

```bash
# Watch logs until you see "Uvicorn running on http://0.0.0.0:8000"
# Takes ~2-3 minutes after update-service
aws logs tail /ecs/soundcloud-discuss/backend \
  --region us-east-1 --since 5m --follow

# Press Ctrl+C once you see the app is running
```

---

## Step 7: Build and deploy the frontend

```bash
cd frontend

# Install deps (first time only)
npm install

# Build the React app for production
npm run build

# Upload to S3 - bucket name comes from Terraform outputs
BUCKET=$(cd ../terraform && terraform output -raw frontend_bucket_name)
aws s3 sync dist/ s3://$BUCKET --delete

# Invalidate CloudFront cache so users see the new version immediately
DIST_ID=$(cd ../terraform && terraform output -raw cloudfront_distribution_id)
aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"

cd ..
```

---

## Step 8: Seed an admin user (optional but recommended)

The app works without this, but you need an admin to access the admin panel.

```bash
# Get the first running ECS task ID
TASK_ID=$(aws ecs list-tasks \
  --cluster soundcloud-discuss-cluster \
  --service-name soundcloud-discuss-backend-service \
  --region us-east-1 \
  --query 'taskArns[0]' --output text | awk -F'/' '{print $NF}')

# Exec into the container and run the seed script
# Note: enable-execute-command must be true on the service (currently it's not,
# so register an admin manually through the app's register page, then use AWS
# console to update the user's global_role to "admin" via RDS query editor,
# OR just register a normal account and demo with that)
```

Simpler approach: register a normal account at `/register` and demo with that. Admin features can be shown by manually updating `global_role` in RDS if needed.

---

## Step 9: Test the live app

```bash
# Get your CloudFront URL
cd terraform && terraform output cloudfront_domain_name
# e.g., d3ve6290vu2dj4.cloudfront.net
```

Open `https://<cloudfront_domain>` in a browser and verify:

1. Home page loads
2. Register a user
3. Submit a SoundCloud track (e.g., `https://soundcloud.com/octobersveryown/drake-nokia`)
4. Open the track — the embedded player should appear
5. Post a comment, reply, and vote

---

## Step 10: Verify security hardening

```bash
# Get the ALB DNS name (WAF SQL injection rules are on the ALB, not CloudFront)
ALB_DNS=$(cd terraform && terraform output -raw alb_dns_name)

# Check WAF is blocking SQL injection (should return 403)
curl -I "http://$ALB_DNS/api/tracks?sort=1%20OR%201=1"

# GuardDuty is disabled (requires paid AWS subscription, not available on free-tier)
# The Terraform code is preserved in guardduty.tf for reference
# See "Enabling GuardDuty" section below for instructions on enabling it

# Check Lambda functions deployed
aws lambda list-functions --region us-east-1 \
  --query 'Functions[?starts_with(FunctionName, `soundcloud-discuss`)].FunctionName'

# Check CloudTrail is logging
aws logs tail /cloudtrail/soundcloud-discuss --region us-east-1 --since 5m
```

---

## Step 11: Tear down to avoid charges

**IMPORTANT** — AWS charges ~$1-2/day while resources are running. Destroy when done testing.

```bash
cd terraform
terraform destroy
# Type: yes
# Takes ~5 minutes. CloudFront is the slowest to remove.
```

---

## Troubleshooting

**Container won't start — "exec format error"**

You built for ARM on an Apple Silicon Mac. Rebuild with `--platform linux/amd64` (see Step 5).

**Container starts but crashes — "DATABASE_URL environment variable is not set"**

The task definition should pull DB credentials from Secrets Manager. Verify: `aws secretsmanager list-secrets --region us-east-1`. If empty, re-run `terraform apply`.

**"relation 'tracks' does not exist"**

Alembic migrations didn't run. Check the Dockerfile CMD — it should be `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000`.

**terraform apply fails with "Character sets beyond ASCII"**

Security group descriptions had non-ASCII characters (em dashes). Already fixed in the repo — make sure you're on the latest master.

**CloudFront shows old version**

Create a new invalidation: `aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"`

---

## Enabling GuardDuty (Optional)

GuardDuty is AWS's threat detection service that monitors for malicious activity by analyzing VPC Flow Logs, CloudTrail events, and DNS logs. It's disabled by default because it requires a paid AWS subscription.

**When to enable:**
- Production deployments
- Paid AWS accounts (not free-tier)
- When compliance requires continuous threat monitoring (NIST SI-3, SI-4)

**Pricing (approximate):**
- 30-day free trial for new AWS accounts
- After trial: ~$4/GB for VPC Flow Logs analysis, ~$1/million CloudTrail events
- Typical small application: $10-50/month

**To enable:**

1. Edit `terraform/guardduty.tf` and uncomment the resource block:
   ```hcl
   resource "aws_guardduty_detector" "main" {
     enable                       = true
     finding_publishing_frequency = "FIFTEEN_MINUTES"

     tags = {
       Name        = "${var.project_name}-guardduty"
       Project     = var.project_name
       Environment = var.environment
     }
   }
   ```

2. Apply the change:
   ```bash
   cd terraform
   terraform plan -out=tfplan
   terraform apply tfplan
   ```

3. Verify GuardDuty is active:
   ```bash
   aws guardduty list-detectors --region us-east-1
   ```

**To disable again:** Comment out the resource block and run `terraform apply`.

---

## What gets deployed

| Resource | Count | Purpose |
|---|---|---|
| VPC + subnets + NAT Gateway | 14 | Network isolation |
| Security Groups | 3 | ALB → Backend → RDS chain |
| ECS Fargate cluster + service | 3 | Runs FastAPI backend |
| ALB + target group + listener | 3 | Routes traffic to ECS |
| RDS PostgreSQL (encrypted) | 2 | Database |
| S3 + CloudFront + OAI | 7 | Frontend hosting |
| IAM roles + policies | 8 | Least privilege access |
| Secrets Manager | 4 | DB creds + JWT secret |
| CloudTrail + CloudWatch | 7 | Audit logging |
| WAF (CloudFront + ALB) | 4 | SQL injection + XSS protection |
| GuardDuty (disabled — free-tier) | 0 | Threat detection (code in repo, requires paid subscription) |
| Lambda (audit + alerts) | 4 | Security event processing |

**Total: ~60 resources**
