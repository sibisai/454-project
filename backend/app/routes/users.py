"""routes/users.py — Public user profiles and authenticated dashboard."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.middleware.rbac import get_current_user, get_optional_user
from app.models import Post, Track, TrackModerator, User, get_db
from app.routes.helpers import get_user_or_404
from app.routes.schemas import (
    DashboardStats,
    ModeratedTrackSummary,
    PaginatedUserPostsResponse,
    PaginatedUserTracksResponse,
    UserDashboardResponse,
    UserPostSummary,
    UserProfileResponse,
    UserTrackSummary,
)

router = APIRouter(prefix="/api/users", tags=["users"])


def _get_public_user_or_404(
    user_id: UUID, db: Session, requester: User | None = None
) -> User:
    """Fetch user; hide banned users from non-admins."""
    user = get_user_or_404(user_id, db)
    is_admin = requester is not None and requester.global_role == "admin"
    if user.is_banned and not is_admin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


def _post_count_subquery(db: Session):
    """Correlated subquery: count of non-removed posts for a track."""
    return (
        db.query(func.count(Post.id))
        .filter(Post.track_id == Track.id, Post.is_removed.is_(False))
        .correlate(Track)
        .scalar_subquery()
    )


# ── Dashboard (must be before /{user_id} to avoid "me" parsed as UUID) ──────


@router.get("/me/dashboard", response_model=UserDashboardResponse)
def get_dashboard(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    post_count_sq = _post_count_subquery(db)

    # My tracks
    my_tracks_rows = (
        db.query(Track.id, Track.title, Track.artist_name, post_count_sq.label("post_count"), Track.created_at)
        .filter(Track.posted_by == user.id)
        .order_by(Track.created_at.desc())
        .all()
    )
    my_tracks = [
        UserTrackSummary(
            id=r.id, title=r.title, artist_name=r.artist_name,
            post_count=r.post_count, created_at=r.created_at,
        )
        for r in my_tracks_rows
    ]

    # Moderated tracks
    mod_rows = (
        db.query(Track.id, Track.title, Track.artist_name, post_count_sq.label("post_count"))
        .join(TrackModerator, TrackModerator.track_id == Track.id)
        .filter(TrackModerator.user_id == user.id)
        .all()
    )
    moderated_tracks = [
        ModeratedTrackSummary(
            id=r.id, title=r.title, artist_name=r.artist_name, post_count=r.post_count,
        )
        for r in mod_rows
    ]

    # Recent activity (last 20 posts by this user)
    activity_rows = (
        db.query(Post.id, Post.content, Post.track_id, Track.title.label("track_title"), Post.created_at)
        .join(Track, Post.track_id == Track.id)
        .filter(Post.author_id == user.id, Post.is_removed.is_(False))
        .order_by(Post.created_at.desc())
        .limit(20)
        .all()
    )
    recent_activity = [
        UserPostSummary(
            id=r.id, content=r.content[:200], track_id=r.track_id,
            track_title=r.track_title, created_at=r.created_at,
        )
        for r in activity_rows
    ]

    # Derive counts from already-fetched lists; only posts_written needs a query
    # because recent_activity is capped at 20.
    posts_written = (
        db.query(func.count(Post.id))
        .filter(Post.author_id == user.id, Post.is_removed.is_(False))
        .scalar()
    )

    return UserDashboardResponse(
        my_tracks=my_tracks,
        moderated_tracks=moderated_tracks,
        recent_activity=recent_activity,
        stats=DashboardStats(
            tracks_posted=len(my_tracks),
            posts_written=posts_written,
            tracks_moderated=len(moderated_tracks),
        ),
    )


# ── Public Profile ───────────────────────────────────────────────────────────


@router.get("/{user_id}", response_model=UserProfileResponse)
def get_user_profile(
    user_id: UUID,
    db: Session = Depends(get_db),
    requester: User | None = Depends(get_optional_user),
):
    target = _get_public_user_or_404(user_id, db, requester)

    is_admin = requester is not None and requester.global_role == "admin"

    track_count = db.query(func.count(Track.id)).filter(Track.posted_by == target.id).scalar()
    post_count = (
        db.query(func.count(Post.id))
        .filter(Post.author_id == target.id, Post.is_removed.is_(False))
        .scalar()
    )

    response = UserProfileResponse(
        id=target.id,
        display_name=target.display_name,
        created_at=target.created_at,
        track_count=track_count,
        post_count=post_count,
    )

    if is_admin:
        response.email = target.email
        response.global_role = target.global_role
        response.is_banned = target.is_banned

    return response


@router.get("/{user_id}/tracks", response_model=PaginatedUserTracksResponse)
def get_user_tracks(
    user_id: UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    requester: User | None = Depends(get_optional_user),
):
    _get_public_user_or_404(user_id, db, requester)

    post_count_sq = _post_count_subquery(db)

    total = db.query(func.count(Track.id)).filter(Track.posted_by == user_id).scalar()
    query = (
        db.query(Track.id, Track.title, Track.artist_name, post_count_sq.label("post_count"), Track.created_at)
        .filter(Track.posted_by == user_id)
    )
    rows = (
        query.order_by(Track.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return PaginatedUserTracksResponse(
        tracks=[
            UserTrackSummary(
                id=r.id, title=r.title, artist_name=r.artist_name,
                post_count=r.post_count, created_at=r.created_at,
            )
            for r in rows
        ],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/{user_id}/posts", response_model=PaginatedUserPostsResponse)
def get_user_posts(
    user_id: UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    requester: User | None = Depends(get_optional_user),
):
    _get_public_user_or_404(user_id, db, requester)

    query = (
        db.query(Post.id, Post.content, Post.track_id, Track.title.label("track_title"), Post.created_at)
        .join(Track, Post.track_id == Track.id)
        .filter(Post.author_id == user_id, Post.is_removed.is_(False))
    )
    total = query.count()
    rows = (
        query.order_by(Post.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return PaginatedUserPostsResponse(
        posts=[
            UserPostSummary(
                id=r.id, content=r.content[:200], track_id=r.track_id,
                track_title=r.track_title, created_at=r.created_at,
            )
            for r in rows
        ],
        total=total,
        page=page,
        per_page=per_page,
    )
