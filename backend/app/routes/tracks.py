"""routes/tracks.py — Track CRUD API endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func as sa_func
from sqlalchemy.orm import Session

from app.middleware.rbac import get_current_user, get_optional_user, get_user_track_role
from app.models import Post, Track, User, get_db
from app.routes.posts import post_to_response
from app.routes.schemas import (
    PaginatedTracksResponse,
    PostResponse,
    TrackCreateRequest,
    TrackDetailResponse,
    TrackResponse,
)
from app.services.oembed import fetch_track_metadata

router = APIRouter(prefix="/api/tracks", tags=["tracks"])


def _track_to_response(track: Track, post_count: int) -> TrackResponse:
    return TrackResponse(
        id=track.id,
        soundcloud_url=track.soundcloud_url,
        title=track.title,
        artist_name=track.artist_name,
        artwork_url=track.artwork_url,
        embed_html=track.embed_html,
        posted_by=track.posted_by,
        poster_display_name=track.poster.display_name,
        post_count=post_count,
        created_at=track.created_at,
    )


def _build_post_tree(posts: list[Post]) -> list[PostResponse]:
    top_level = [p for p in posts if p.parent_id is None]
    # Pinned first, then unpinned; each group sorted by creation time
    top_level.sort(key=lambda p: (not p.is_pinned, p.created_at))
    return [post_to_response(p) for p in top_level]


@router.post("", response_model=TrackResponse, status_code=status.HTTP_201_CREATED)
async def create_track(
    body: TrackCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    existing = (
        db.query(Track)
        .filter(Track.soundcloud_url == body.soundcloud_url)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Track already posted"
        )

    metadata = await fetch_track_metadata(body.soundcloud_url)

    track = Track(
        soundcloud_url=body.soundcloud_url,
        title=metadata["title"],
        artist_name=metadata["artist_name"],
        artwork_url=metadata["artwork_url"],
        embed_html=metadata["embed_html"],
        posted_by=user.id,
    )
    db.add(track)
    db.commit()
    db.refresh(track)

    return _track_to_response(track, post_count=0)


@router.get("", response_model=PaginatedTracksResponse)
def list_tracks(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
):
    post_count_sq = (
        db.query(sa_func.count(Post.id))
        .filter(Post.track_id == Track.id, Post.is_removed.is_(False))
        .correlate(Track)
        .scalar_subquery()
        .label("post_count")
    )

    query = db.query(Track, post_count_sq).join(Track.poster)

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            Track.title.ilike(pattern) | Track.artist_name.ilike(pattern)
        )

    total = query.count()
    rows = (
        query.order_by(Track.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    tracks = [_track_to_response(track, count or 0) for track, count in rows]
    return PaginatedTracksResponse(
        tracks=tracks, total=total, page=page, per_page=per_page
    )


@router.get("/{track_id}", response_model=TrackDetailResponse)
def get_track(
    track_id: UUID,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Track not found"
        )

    post_count = (
        db.query(sa_func.count(Post.id))
        .filter(Post.track_id == track.id, Post.is_removed.is_(False))
        .scalar()
    )
    all_posts = db.query(Post).filter(Post.track_id == track.id).all()
    base = _track_to_response(track, post_count or 0)

    return TrackDetailResponse(
        **base.model_dump(),
        user_role=get_user_track_role(user, track.id, db),
        posts=_build_post_tree(all_posts),
    )
