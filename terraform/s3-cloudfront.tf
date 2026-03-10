# s3-cloudfront.tf — S3 bucket for React, CloudFront distribution, OAI
#
# This file provisions:
#   - S3 bucket for static React build assets (private ACL)
#   - S3 bucket policy restricting access to CloudFront OAI
#   - CloudFront Origin Access Identity (OAI)
#   - CloudFront distribution with S3 origin
#   - Default cache behavior (GET/HEAD, HTTPS redirect)
#   - Custom error response for SPA routing (404 → index.html)
#   - Optional custom domain and ACM certificate
