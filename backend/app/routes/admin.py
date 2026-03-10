"""
routes/admin.py — Admin API endpoints.

Endpoints:
  GET    /api/admin/users        — List all users (admin only)
  PUT    /api/admin/users/:id    — Update user role
  DELETE /api/admin/users/:id    — Deactivate a user account
  GET    /api/admin/audit-log    — View audit log entries (paginated)
"""
