"""
services/audit.py — Audit log recording service.
"""

from uuid import UUID

from sqlalchemy.orm import Session

from app.models import AuditLog

ACTION_POST_REMOVED = "post_removed"
ACTION_USER_BANNED = "user_banned"
ACTION_USER_UNBANNED = "user_unbanned"
ACTION_ROLE_CHANGED = "role_changed"
ACTION_MOD_DELEGATED = "mod_delegated"
ACTION_MOD_REVOKED = "mod_revoked"
ACTION_POST_PINNED = "post_pinned"
ACTION_POST_UNPINNED = "post_unpinned"


def log_action(
    db: Session,
    actor_id: UUID,
    action: str,
    target_type: str,
    target_id: UUID,
    details: dict | None = None,
) -> None:
    entry = AuditLog(
        actor_id=actor_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details,
    )
    db.add(entry)
    db.flush()
