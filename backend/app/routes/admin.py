"""routes/admin.py — Admin panel API endpoints (admin-only)."""

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.middleware.rbac import get_current_user, require_role
from app.models import AuditLog, Post, Track, TrackModerator, User, get_db
from app.routes.schemas import (
    AdminStatsResponse,
    AdminUserResponse,
    AuditLogResponse,
    PaginatedAuditLogResponse,
    PaginatedUsersResponse,
    RoleChangeRequest,
)
from app.services.audit import (
    ACTION_MOD_REVOKED,
    ACTION_ROLE_CHANGED,
    ACTION_USER_BANNED,
    ACTION_USER_UNBANNED,
    log_action,
)

router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(require_role("admin"))],
)


def _get_user_or_404(user_id: UUID, db: Session) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


def _build_admin_user_response(user: User, db: Session) -> AdminUserResponse:
    track_count = db.query(func.count(Track.id)).filter(Track.posted_by == user.id).scalar()
    post_count = (
        db.query(func.count(Post.id))
        .filter(Post.author_id == user.id, Post.is_removed.is_(False))
        .scalar()
    )
    return AdminUserResponse(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        global_role=user.global_role,
        is_banned=user.is_banned,
        created_at=user.created_at,
        track_count=track_count,
        post_count=post_count,
    )


def _audit_entry_to_response(entry: AuditLog, actor_display_name: str) -> AuditLogResponse:
    return AuditLogResponse(
        id=entry.id,
        actor_id=entry.actor_id,
        actor_display_name=actor_display_name,
        action=entry.action,
        target_type=entry.target_type,
        target_id=entry.target_id,
        details=entry.details,
        created_at=entry.created_at,
    )


# ── Users ────────────────────────────────────────────────────────────────────


@router.get("/users", response_model=PaginatedUsersResponse)
def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str | None = None,
    role: str | None = None,
    banned: bool | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(User)

    if search:
        escaped = search.replace("%", "\\%").replace("_", "\\_")
        pattern = f"%{escaped}%"
        query = query.filter(User.email.ilike(pattern) | User.display_name.ilike(pattern))
    if role is not None:
        query = query.filter(User.global_role == role)
    if banned is not None:
        query = query.filter(User.is_banned == banned)

    total = query.count()
    users = (
        query.order_by(User.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return PaginatedUsersResponse(
        users=[_build_admin_user_response(u, db) for u in users],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.put("/users/{user_id}/role", response_model=AdminUserResponse)
def change_user_role(
    user_id: UUID,
    body: RoleChangeRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_user),
):
    target = _get_user_or_404(user_id, db)

    if target.id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot change your own role"
        )
    if target.global_role == body.role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="User already has this role"
        )

    # Prevent demoting the last admin
    if target.global_role == "admin" and body.role != "admin":
        admin_count = db.query(func.count(User.id)).filter(User.global_role == "admin").scalar()
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote the last admin",
            )

    old_role = target.global_role
    target.global_role = body.role
    log_action(
        db,
        actor_id=admin.id,
        action=ACTION_ROLE_CHANGED,
        target_type="user",
        target_id=user_id,
        details={"old_role": old_role, "new_role": body.role, "user_email": target.email},
    )
    db.commit()
    db.refresh(target)
    return _build_admin_user_response(target, db)


# ── Ban / Unban ──────────────────────────────────────────────────────────────


@router.post("/users/{user_id}/ban", response_model=AdminUserResponse)
def ban_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_user),
):
    target = _get_user_or_404(user_id, db)

    if target.id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot ban yourself"
        )
    if target.global_role == "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot ban an admin user \u2014 demote them first",
        )
    if target.is_banned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="User is already banned"
        )

    target.is_banned = True

    # Revoke all moderator delegations for the banned user
    mod_entries = db.query(TrackModerator).filter(TrackModerator.user_id == user_id).all()
    for mod in mod_entries:
        log_action(
            db,
            actor_id=admin.id,
            action=ACTION_MOD_REVOKED,
            target_type="user",
            target_id=user_id,
            details={"track_id": str(mod.track_id), "reason": "user_banned"},
        )
        db.delete(mod)

    log_action(
        db,
        actor_id=admin.id,
        action=ACTION_USER_BANNED,
        target_type="user",
        target_id=user_id,
        details={
            "user_email": target.email,
            "moderator_delegations_revoked": len(mod_entries),
        },
    )
    db.commit()
    db.refresh(target)
    return _build_admin_user_response(target, db)


@router.delete("/users/{user_id}/ban", response_model=AdminUserResponse)
def unban_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_user),
):
    target = _get_user_or_404(user_id, db)

    if not target.is_banned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="User is not banned"
        )

    target.is_banned = False
    log_action(
        db,
        actor_id=admin.id,
        action=ACTION_USER_UNBANNED,
        target_type="user",
        target_id=user_id,
        details={"user_email": target.email},
    )
    db.commit()
    db.refresh(target)
    return _build_admin_user_response(target, db)


# ── Audit Log ────────────────────────────────────────────────────────────────


@router.get("/audit-log", response_model=PaginatedAuditLogResponse)
def list_audit_log(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    action: str | None = None,
    actor_id: UUID | None = None,
    target_type: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(AuditLog, User.display_name).join(User, AuditLog.actor_id == User.id)

    if action:
        query = query.filter(AuditLog.action == action)
    if actor_id:
        query = query.filter(AuditLog.actor_id == actor_id)
    if target_type:
        query = query.filter(AuditLog.target_type == target_type)
    if date_from:
        query = query.filter(func.date(AuditLog.created_at) >= date_from)
    if date_to:
        query = query.filter(func.date(AuditLog.created_at) <= date_to)

    total = query.count()
    rows = (
        query.order_by(AuditLog.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return PaginatedAuditLogResponse(
        entries=[_audit_entry_to_response(entry, name) for entry, name in rows],
        total=total,
        page=page,
        per_page=per_page,
    )


# ── Stats ────────────────────────────────────────────────────────────────────


@router.get("/stats", response_model=AdminStatsResponse)
def get_stats(db: Session = Depends(get_db)):
    total_users = db.query(func.count(User.id)).scalar()
    total_tracks = db.query(func.count(Track.id)).scalar()
    total_posts = (
        db.query(func.count(Post.id)).filter(Post.is_removed.is_(False)).scalar()
    )
    total_removed_posts = (
        db.query(func.count(Post.id)).filter(Post.is_removed.is_(True)).scalar()
    )
    banned_users = (
        db.query(func.count(User.id)).filter(User.is_banned.is_(True)).scalar()
    )
    total_moderators = (
        db.query(func.count(func.distinct(TrackModerator.user_id))).scalar()
    )

    recent_rows = (
        db.query(AuditLog, User.display_name)
        .join(User, AuditLog.actor_id == User.id)
        .order_by(AuditLog.created_at.desc())
        .limit(10)
        .all()
    )

    return AdminStatsResponse(
        total_users=total_users,
        total_tracks=total_tracks,
        total_posts=total_posts,
        total_removed_posts=total_removed_posts,
        banned_users=banned_users,
        total_moderators=total_moderators,
        recent_actions=[_audit_entry_to_response(e, name) for e, name in recent_rows],
    )
