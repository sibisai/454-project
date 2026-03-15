# vpc.tf — VPC, subnets, NAT gateway, route tables
#
# Network topology:
#   - 2 public subnets  (ALB, NAT gateway) — direct internet via IGW
#   - 2 private subnets (ECS tasks, RDS)   — outbound-only via NAT
#
# Private subnets have no direct internet access — outbound traffic
# routes through the NAT Gateway so containers can pull images and
# patches without being publicly reachable.

# ──────────────────────────────────────────────
# VPC
# ──────────────────────────────────────────────

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name        = "${var.project_name}-vpc"
    Project     = var.project_name
    Environment = var.environment
  }
}

# ──────────────────────────────────────────────
# Public Subnets — internet-facing (ALB, NAT GW)
# ──────────────────────────────────────────────

resource "aws_subnet" "public_1" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true

  tags = {
    Name        = "${var.project_name}-public-1"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_subnet" "public_2" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = data.aws_availability_zones.available.names[1]
  map_public_ip_on_launch = true

  tags = {
    Name        = "${var.project_name}-public-2"
    Project     = var.project_name
    Environment = var.environment
  }
}

# ──────────────────────────────────────────────
# Private Subnets — no direct internet access
# Outbound traffic routes through the NAT Gateway
# so ECS tasks can pull images without being publicly reachable.
# ──────────────────────────────────────────────

resource "aws_subnet" "private_1" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.3.0/24"
  availability_zone = data.aws_availability_zones.available.names[0]

  tags = {
    Name        = "${var.project_name}-private-1"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_subnet" "private_2" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.4.0/24"
  availability_zone = data.aws_availability_zones.available.names[1]

  tags = {
    Name        = "${var.project_name}-private-2"
    Project     = var.project_name
    Environment = var.environment
  }
}

# ──────────────────────────────────────────────
# Internet Gateway — allows public subnets to reach the internet
# ──────────────────────────────────────────────

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "${var.project_name}-igw"
    Project     = var.project_name
    Environment = var.environment
  }
}

# ──────────────────────────────────────────────
# NAT Gateway — gives private subnets outbound-only internet
# Placed in the first public subnet; uses an Elastic IP so the
# outbound address is stable (useful for allowlisting).
# ──────────────────────────────────────────────

resource "aws_eip" "nat" {
  domain = "vpc"

  tags = {
    Name        = "${var.project_name}-nat-eip"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public_1.id

  tags = {
    Name        = "${var.project_name}-nat"
    Project     = var.project_name
    Environment = var.environment
  }

  depends_on = [aws_internet_gateway.main]
}

# ──────────────────────────────────────────────
# Route Tables
# ──────────────────────────────────────────────

# Public route table — default route to the Internet Gateway
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name        = "${var.project_name}-public-rt"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_route_table_association" "public_1" {
  subnet_id      = aws_subnet.public_1.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_2" {
  subnet_id      = aws_subnet.public_2.id
  route_table_id = aws_route_table.public.id
}

# Private route table — default route to the NAT Gateway
# This ensures containers in private subnets can reach the internet
# (e.g., pulling Docker images) without being directly reachable.
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  tags = {
    Name        = "${var.project_name}-private-rt"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_route_table_association" "private_1" {
  subnet_id      = aws_subnet.private_1.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "private_2" {
  subnet_id      = aws_subnet.private_2.id
  route_table_id = aws_route_table.private.id
}
