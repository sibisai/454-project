"""routes/moderation.py — Pin/unpin posts and moderator delegation endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.middleware.rbac import get_current_user, get_optional_user, get_user_track_role
from app.models import Post, Track, TrackModerator, User, get_db
from app.routes.posts import post_to_response
from app.routes.schemas import (
    MessageResponse,
    ModeratorDetailResponse,
    ModeratorListResponse,
    ModeratorResponse,
    PostResponse,
)
from app.services.audit import (
    ACTION_MOD_DELEGATED,
    ACTION_MOD_REVOKED,
    ACTION_POST_PINNED,
    ACTION_POST_UNPINNED,
    log_action,
)

router = APIRouter(tags=["moderation"])

MAX_PINNED_PER_TRACK = 3


def _require_artist_or_admin(user: User, track_id: UUID, db: Session) -> str:
    role = get_user_track_role(user, track_id, db)
    if role not in ("artist", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the track artist or admin can perform this action",
        )
    return role


def _get_track_or_404(track_id: UUID, db: Session) -> Track:
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Track not found")
    return track


def _get_post_on_track_or_404(post_id: UUID, track_id: UUID, db: Session) -> Post:
    post = db.query(Post).filter(Post.id == post_id, Post.track_id == track_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Post not found on this track"
        )
    return post


# ── Pin / Unpin ──────────────────────────────────────────────────────────────


@router.post("/api/tracks/{track_id}/pin/{post_id}", response_model=PostResponse)
def pin_post(
    track_id: UUID,
    post_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _get_track_or_404(track_id, db)
    _require_artist_or_admin(user, track_id, db)
    post = _get_post_on_track_or_404(post_id, track_id, db)

    if post.is_removed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot pin a removed post"
        )
    if post.is_pinned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Post is already pinned"
        )

    # Note: pin count check is not atomic; concurrent requests could exceed the limit.
    # Acceptable for a single-process class project.
    pinned_count = (
        db.query(Post)
        .filter(Post.track_id == track_id, Post.is_pinned.is_(True))
        .count()
    )
    if pinned_count >= MAX_PINNED_PER_TRACK:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum {MAX_PINNED_PER_TRACK} pinned posts per track",
        )

    post.is_pinned = True
    log_action(
        db,
        actor_id=user.id,
        action=ACTION_POST_PINNED,
        target_type="post",
        target_id=post.id,
        details={"track_id": str(track_id)},
    )
    db.commit()
    db.refresh(post)
    return post_to_response(post)


@router.delete("/api/tracks/{track_id}/pin/{post_id}", response_model=PostResponse)
def unpin_post(
    track_id: UUID,
    post_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _get_track_or_404(track_id, db)
    _require_artist_or_admin(user, track_id, db)
    post = _get_post_on_track_or_404(post_id, track_id, db)

    if post.is_removed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot unpin a removed post"
        )
    if not post.is_pinned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Post is not pinned"
        )

    post.is_pinned = False
    log_action(
        db,
        actor_id=user.id,
        action=ACTION_POST_UNPINNED,
        target_type="post",
        target_id=post.id,
        details={"track_id": str(track_id)},
    )
    db.commit()
    db.refresh(post)
    return post_to_response(post)


# ── Moderator Delegation ────────────────────────────────────────────────────


@router.post(
    "/api/tracks/{track_id}/moderators/{user_id}",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
)
def delegate_moderator(
    track_id: UUID,
    user_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    track = _get_track_or_404(track_id, db)
    role = _require_artist_or_admin(user, track_id, db)

    if user_id == user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delegate moderator to yourself",
        )
    if track.posted_by == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Track artist already has full moderation power",
        )

    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if target_user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delegate a banned user as moderator",
        )

    existing = (
        db.query(TrackModerator)
        .filter(TrackModerator.track_id == track_id, TrackModerator.user_id == user_id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a moderator on this track",
        )

    mod = TrackModerator(track_id=track_id, user_id=user_id, delegated_by=user.id)
    db.add(mod)
    log_action(
        db,
        actor_id=user.id,
        action=ACTION_MOD_DELEGATED,
        target_type="user",
        target_id=user_id,
        details={"track_id": str(track_id), "actor_role": role},
    )
    db.commit()
    return MessageResponse(message="Moderator delegated")


@router.delete(
    "/api/tracks/{track_id}/moderators/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def revoke_moderator(
    track_id: UUID,
    user_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _get_track_or_404(track_id, db)
    _require_artist_or_admin(user, track_id, db)

    mod = (
        db.query(TrackModerator)
        .filter(TrackModerator.track_id == track_id, TrackModerator.user_id == user_id)
        .first()
    )
    if not mod:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not a moderator on this track",
        )

    db.delete(mod)
    log_action(
        db,
        actor_id=user.id,
        action=ACTION_MOD_REVOKED,
        target_type="user",
        target_id=user_id,
        details={"track_id": str(track_id)},
    )
    db.commit()


@router.get(
    "/api/tracks/{track_id}/moderators",
    response_model=ModeratorListResponse,
)
def list_moderators(
    track_id: UUID,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    _get_track_or_404(track_id, db)

    role = get_user_track_role(user, track_id, db)
    is_privileged = role in ("artist", "admin", "moderator")

    mods = (
        db.query(TrackModerator, User)
        .join(User, TrackModerator.user_id == User.id)
        .filter(TrackModerator.track_id == track_id)
        .all()
    )

    if is_privileged:
        delegator_ids = {m.delegated_by for m, _ in mods}
        delegators = {
            u.id: u.display_name
            for u in db.query(User).filter(User.id.in_(delegator_ids)).all()
        }
        moderators = [
            ModeratorDetailResponse(
                user_id=mod.user_id,
                display_name=mod_user.display_name,
                email=mod_user.email,
                delegated_by=mod.delegated_by,
                delegated_by_display_name=delegators.get(mod.delegated_by, "Unknown"),
                created_at=mod.created_at,
            )
            for mod, mod_user in mods
        ]
    else:
        moderators = [
            ModeratorResponse(user_id=mod.user_id, display_name=mod_user.display_name)
            for mod, mod_user in mods
        ]

    return ModeratorListResponse(track_id=track_id, moderators=moderators)
