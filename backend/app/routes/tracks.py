"""routes/tracks.py — Track CRUD API endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func as sa_func
from sqlalchemy.orm import Session

from app.middleware.rbac import get_current_user, get_optional_user
from app.models import Post, Track, TrackModerator, User, get_db
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


def _post_to_response(post: Post) -> PostResponse:
    return PostResponse(
        id=post.id,
        track_id=post.track_id,
        author_id=post.author_id,
        author_display_name=post.author.display_name,
        parent_id=post.parent_id,
        content=post.content,
        is_pinned=post.is_pinned,
        is_removed=post.is_removed,
        created_at=post.created_at,
        updated_at=post.updated_at,
        replies=[_post_to_response(r) for r in post.replies if not r.is_removed],
    )


def _build_post_tree(posts: list[Post]) -> list[PostResponse]:
    top_level = [p for p in posts if p.parent_id is None]
    pinned = sorted(
        [p for p in top_level if p.is_pinned], key=lambda p: p.created_at
    )
    unpinned = sorted(
        [p for p in top_level if not p.is_pinned], key=lambda p: p.created_at
    )
    return [_post_to_response(p) for p in pinned + unpinned]


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

    # Determine user role on this track
    user_role = None
    if user:
        if track.posted_by == user.id:
            user_role = "artist"
        else:
            is_mod = (
                db.query(TrackModerator)
                .filter(
                    TrackModerator.track_id == track.id,
                    TrackModerator.user_id == user.id,
                )
                .first()
            )
            if is_mod:
                user_role = "moderator"

    visible_posts = (
        db.query(Post)
        .filter(Post.track_id == track.id, Post.is_removed.is_(False))
        .all()
    )

    return TrackDetailResponse(
        id=track.id,
        soundcloud_url=track.soundcloud_url,
        title=track.title,
        artist_name=track.artist_name,
        artwork_url=track.artwork_url,
        embed_html=track.embed_html,
        posted_by=track.posted_by,
        poster_display_name=track.poster.display_name,
        post_count=post_count or 0,
        created_at=track.created_at,
        user_role=user_role,
        posts=_build_post_tree(visible_posts),
    )
