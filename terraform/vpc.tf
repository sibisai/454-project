# vpc.tf — VPC, subnets, NAT gateway, route tables
#
# This file provisions:
#   - VPC with DNS support enabled
#   - 2 public subnets (across 2 AZs) for ALB and NAT gateway
#   - 2 private subnets (across 2 AZs) for ECS tasks and RDS
#   - Internet gateway for public subnets
#   - NAT gateway (single) for private subnet outbound traffic
#   - Public route table (routes to IGW)
#   - Private route table (routes to NAT gateway)
#   - Route table associations
