# security-groups.tf — Security groups for ALB, backend (ECS), and RDS
#
# Traffic flow:  Internet → ALB (ports 80/443) → Backend (port 8000) → RDS (port 5432)
#
# Each security group only allows inbound traffic from the tier directly
# above it, referenced by SG ID rather than CIDR. This ensures access is
# tied to identity (which SG a resource belongs to), not network location.

# ──────────────────────────────────────────────
# ALB Security Group
# ──────────────────────────────────────────────
# The ALB is the only resource that accepts traffic directly from the
# internet. Port 80 is open so the ALB can issue 301 redirects to HTTPS;
# actual application traffic is served over port 443.

resource "aws_security_group" "alb" {
  name        = "${var.project_name}-alb-sg"
  description = "ALB is the only resource in the public subnet accepting internet traffic"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name        = "${var.project_name}-alb-sg"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_vpc_security_group_ingress_rule" "alb_https" {
  security_group_id = aws_security_group.alb.id
  description       = "HTTPS from the internet"
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

# Port 80: forwards plaintext HTTP to backend in dev.
# TODO: swap listener to 301 redirect once ACM/CloudFront are in place.
resource "aws_vpc_security_group_ingress_rule" "alb_http" {
  security_group_id = aws_security_group.alb.id
  description       = "HTTP from the internet (redirected to HTTPS by ALB listener)"
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_vpc_security_group_egress_rule" "alb_all_out" {
  security_group_id = aws_security_group.alb.id
  description       = "Allow all outbound (health checks to backend targets)"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

# ──────────────────────────────────────────────
# Backend (ECS) Security Group
# ──────────────────────────────────────────────
# Backend containers accept traffic ONLY from the ALB — no direct public
# access. The SG-to-SG reference means only resources attached to the ALB
# security group can reach port 8000, regardless of subnet or IP.

resource "aws_security_group" "backend" {
  name        = "${var.project_name}-backend-sg"
  description = "Backend accepts traffic only from ALB — no direct public access"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name        = "${var.project_name}-backend-sg"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_vpc_security_group_ingress_rule" "backend_from_alb" {
  security_group_id            = aws_security_group.backend.id
  description                  = "FastAPI traffic from ALB only"
  referenced_security_group_id = aws_security_group.alb.id
  from_port                    = 8000
  to_port                      = 8000
  ip_protocol                  = "tcp"

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

# Outbound is unrestricted so containers can reach RDS, Secrets Manager
# endpoints, and the internet (via NAT) for pulling images and patches.
resource "aws_vpc_security_group_egress_rule" "backend_all_out" {
  security_group_id = aws_security_group.backend.id
  description       = "Outbound to RDS, Secrets Manager, and internet via NAT"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

# ──────────────────────────────────────────────
# RDS Security Group
# ──────────────────────────────────────────────
# The database accepts connections ONLY from backend containers — defense
# in depth. Even if an attacker reaches the VPC, they cannot connect to
# the database unless they control a resource in the backend SG.
# Egress is restricted to VPC-only traffic. RDS does not need internet
# access. Without an explicit egress rule, AWS leaves a default
# "allow all" egress in place, so we lock it down to the VPC CIDR.

resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds-sg"
  description = "Database accepts connections only from backend containers — defense in depth"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name        = "${var.project_name}-rds-sg"
    Project     = var.project_name
    Environment = var.environment
  }
}

# Restrict outbound to VPC only — RDS has no need to reach the internet.
# This overrides the AWS default "allow all" egress rule.
resource "aws_vpc_security_group_egress_rule" "rds_vpc_only" {
  security_group_id = aws_security_group.rds.id
  description       = "Allow outbound only within VPC (no internet access)"
  cidr_ipv4         = "10.0.0.0/16"
  ip_protocol       = "-1"

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_vpc_security_group_ingress_rule" "rds_from_backend" {
  security_group_id            = aws_security_group.rds.id
  description                  = "PostgreSQL from backend containers only"
  referenced_security_group_id = aws_security_group.backend.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}
