"""routes/discover.py — Discover / Trending endpoint."""

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.rbac import get_optional_user
from app.models.like import TrackLike
from app.models.post import Post
from app.models.track import Track
from app.models.user import User
from app.routes.schemas import DiscoverResponse, DiscoverTrackResponse

router = APIRouter(prefix="/api/discover", tags=["discover"])

LIMIT = 10


def _post_count_subquery(db: Session):
    return (
        db.query(func.count(Post.id))
        .filter(Post.track_id == Track.id, Post.is_removed.is_(False))
        .correlate(Track)
        .scalar_subquery()
        .label("post_count")
    )


def _to_discover_track(row, *, last_activity=None, created_at=None):
    return DiscoverTrackResponse(
        id=row.id,
        title=row.title,
        artist_name=row.artist_name,
        artwork_url=row.artwork_url,
        post_count=row.post_count,
        posted_by_display_name=row.display_name,
        last_activity=last_activity,
        created_at=created_at,
    )


@router.get("", response_model=DiscoverResponse)
def get_discover(
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    post_count_sq = _post_count_subquery(db)

    # ── Trending: top tracks by post count ──
    trending_rows = (
        db.query(
            Track.id,
            Track.title,
            Track.artist_name,
            Track.artwork_url,
            func.count(Post.id).label("post_count"),
            User.display_name,
        )
        .join(Post, Post.track_id == Track.id)
        .join(User, User.id == Track.posted_by)
        .filter(Post.is_removed.is_(False))
        .group_by(Track.id, User.display_name)
        .order_by(func.count(Post.id).desc())
        .limit(LIMIT)
        .all()
    )
    trending = [_to_discover_track(r) for r in trending_rows]

    # ── Recently Active: tracks with newest discussion ──
    recently_active_rows = (
        db.query(
            Track.id,
            Track.title,
            Track.artist_name,
            Track.artwork_url,
            func.count(Post.id).label("post_count"),
            User.display_name,
            func.max(Post.created_at).label("last_activity"),
        )
        .join(Post, Post.track_id == Track.id)
        .join(User, User.id == Track.posted_by)
        .filter(Post.is_removed.is_(False))
        .group_by(Track.id, User.display_name)
        .order_by(func.max(Post.created_at).desc())
        .limit(LIMIT)
        .all()
    )
    recently_active = [
        _to_discover_track(r, last_activity=r.last_activity)
        for r in recently_active_rows
    ]

    # ── New Arrivals: newest tracks ──
    new_arrival_rows = (
        db.query(
            Track.id,
            Track.title,
            Track.artist_name,
            Track.artwork_url,
            post_count_sq,
            User.display_name,
            Track.created_at,
        )
        .join(User, User.id == Track.posted_by)
        .order_by(Track.created_at.desc())
        .limit(LIMIT)
        .all()
    )
    new_arrivals = [
        _to_discover_track(r, created_at=r.created_at) for r in new_arrival_rows
    ]

    # ── Recommended: collaborative filtering ──
    recommended = []
    if user is not None:
        user_liked = (
            db.query(TrackLike.track_id)
            .filter(TrackLike.user_id == user.id)
            .subquery()
        )
        similar_users = (
            db.query(TrackLike.user_id)
            .filter(TrackLike.track_id.in_(select(user_liked)))
            .filter(TrackLike.user_id != user.id)
            .distinct()
            .subquery()
        )
        rec_rows = (
            db.query(
                Track.id,
                Track.title,
                Track.artist_name,
                Track.artwork_url,
                post_count_sq,
                User.display_name,
            )
            .join(TrackLike, TrackLike.track_id == Track.id)
            .join(User, User.id == Track.posted_by)
            .filter(TrackLike.user_id.in_(select(similar_users)))
            .filter(~Track.id.in_(select(user_liked)))
            .group_by(Track.id, User.display_name)
            .order_by(func.count(TrackLike.user_id).desc())
            .limit(LIMIT)
            .all()
        )
        recommended = [_to_discover_track(r) for r in rec_rows]

    # Fall back to trending only for unauthenticated users
    if user is None:
        recommended = trending[:LIMIT]

    return DiscoverResponse(
        trending=trending,
        recently_active=recently_active,
        new_arrivals=new_arrivals,
        recommended=recommended,
    )
