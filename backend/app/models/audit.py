"""
models/audit.py — SQLAlchemy AuditLog and TrackModerator models.

AuditLog table fields:
  - id, user_id (FK), action, resource_type, resource_id
  - details (JSON), timestamp

TrackModerator table fields:
  - id, track_id (FK to Track), user_id (FK to User)
  - assigned_by (FK to User), assigned_at
"""
