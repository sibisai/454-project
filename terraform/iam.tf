# iam.tf — IAM roles and policies
#
# This file provisions:
#   - ECS task execution role (pull images, write logs)
#   - ECS task role (access RDS, S3, other AWS services)
#   - Lambda execution role (CloudWatch logs, SNS publish)
#   - S3 read-only policy for CloudFront OAI
#   - Trust policies for ECS and Lambda service principals
#   - Any additional least-privilege policies
