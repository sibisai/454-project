"""
middleware/rate_limit.py — Rate limiting middleware.

Implements rate limiting for authentication endpoints to prevent
brute-force attacks. Uses in-memory or Redis-backed token bucket
algorithm.
"""
