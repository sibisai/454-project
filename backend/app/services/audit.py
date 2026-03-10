"""
services/audit.py — Audit log recording service.

Provides functions to:
  - Record user actions (create, update, delete) to the AuditLog table
  - Include actor, action type, target resource, and details
  - Optionally emit events for Lambda-based audit processing
"""
