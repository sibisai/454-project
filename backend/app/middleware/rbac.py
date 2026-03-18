"""
middleware/rbac.py — FastAPI dependencies for auth and role-based access control.
"""

from uuid import UUID

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.jwt import decode_token
from app.models import Track, TrackModerator, User, get_db


def get_current_user(
    authorization: str = Header(None), db: Session = Depends(get_db)
) -> User:
    if authorization is None or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid token",
        )
    token = authorization.removeprefix("Bearer ")
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type"
        )
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )
    if user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Account is suspended"
        )
    return user


def require_role(*roles: str):
    def _role_dependency(user: User = Depends(get_current_user)) -> User:
        if user.global_role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user

    return _role_dependency


def get_user_track_role(user: User | None, track_id: UUID, db: Session) -> str | None:
    """Return the user's role on a specific track: 'admin', 'artist', 'moderator', or None."""
    if user is None:
        return None
    if user.global_role == "admin":
        return "admin"
    track = db.query(Track).filter(Track.id == track_id).first()
    if track and track.posted_by == user.id:
        return "artist"
    is_mod = (
        db.query(TrackModerator)
        .filter(
            TrackModerator.track_id == track_id,
            TrackModerator.user_id == user.id,
        )
        .first()
    )
    return "moderator" if is_mod else None


def can_moderate_track(user: User, track_id: UUID, db: Session) -> bool:
    return get_user_track_role(user, track_id, db) in ("admin", "artist", "moderator")


def get_optional_user(
    authorization: str = Header(None), db: Session = Depends(get_db)
) -> User | None:
    """Same as get_current_user but returns None instead of raising on failure."""
    try:
        return get_current_user(authorization, db)
    except HTTPException:
        return None
