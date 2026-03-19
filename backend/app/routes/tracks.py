"""routes/tracks.py — Track CRUD API endpoints."""

from uuid import UUID

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func as sa_func, literal
from sqlalchemy.orm import Session

from app.middleware.rbac import get_current_user, get_optional_user, get_user_track_role
from app.models import Post, PostVote, Track, TrackLike, User, get_db
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


def _get_track_or_404(db: Session, track_id: UUID) -> Track:
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Track not found"
        )
    return track


def _track_to_response(
    track: Track,
    post_count: int,
    like_count: int = 0,
    user_has_liked: bool = False,
) -> TrackResponse:
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
        like_count=like_count,
        user_has_liked=user_has_liked,
        created_at=track.created_at,
    )


def _build_post_tree(
    posts: list[Post],
    score_map: dict | None = None,
    user_vote_map: dict | None = None,
) -> list[PostResponse]:
    top_level = [p for p in posts if p.parent_id is None]
    top_level.sort(key=lambda p: (not p.is_pinned, p.created_at))
    return [post_to_response(p, score_map, user_vote_map) for p in top_level]


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
    sort: Literal["popular", "recent"] | None = Query(None),
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    post_count_sq = (
        db.query(sa_func.count(Post.id))
        .filter(Post.track_id == Track.id, Post.is_removed.is_(False))
        .correlate(Track)
        .scalar_subquery()
        .label("post_count")
    )

    like_count_sq = (
        db.query(sa_func.count(TrackLike.user_id))
        .filter(TrackLike.track_id == Track.id)
        .correlate(Track)
        .scalar_subquery()
        .label("like_count")
    )

    if user:
        user_liked_sq = (
            db.query(sa_func.count(TrackLike.user_id))
            .filter(TrackLike.track_id == Track.id, TrackLike.user_id == user.id)
            .correlate(Track)
            .scalar_subquery()
            .label("user_liked")
        )
    else:
        user_liked_sq = literal(0).label("user_liked")

    query = db.query(Track, post_count_sq, like_count_sq, user_liked_sq).join(
        Track.poster
    )

    if search:
        escaped = search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        pattern = f"%{escaped}%"
        query = query.filter(
            Track.title.ilike(pattern) | Track.artist_name.ilike(pattern)
        )

    total = query.count()

    # Sort: search always by recency; otherwise respect sort param
    if search or sort == "recent":
        query = query.order_by(Track.created_at.desc())
    else:
        # Default (popular): likes desc, then recency
        query = query.order_by(like_count_sq.desc(), Track.created_at.desc())

    rows = query.offset((page - 1) * per_page).limit(per_page).all()

    tracks = [
        _track_to_response(track, count or 0, likes or 0, bool(liked))
        for track, count, likes, liked in rows
    ]
    return PaginatedTracksResponse(
        tracks=tracks, total=total, page=page, per_page=per_page
    )


@router.get("/{track_id}", response_model=TrackDetailResponse)
def get_track(
    track_id: UUID,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    track = _get_track_or_404(db, track_id)

    post_count = (
        db.query(sa_func.count(Post.id))
        .filter(Post.track_id == track.id, Post.is_removed.is_(False))
        .scalar()
    )

    like_count = (
        db.query(sa_func.count(TrackLike.user_id))
        .filter(TrackLike.track_id == track.id)
        .scalar()
    )

    user_has_liked = False
    if user:
        user_has_liked = (
            db.query(TrackLike)
            .filter(TrackLike.track_id == track.id, TrackLike.user_id == user.id)
            .first()
            is not None
        )

    all_posts = db.query(Post).filter(Post.track_id == track.id).all()

    # Batch-fetch post vote scores
    post_ids = [p.id for p in all_posts]
    score_map = {}
    user_vote_map = {}

    if post_ids:
        score_rows = (
            db.query(PostVote.post_id, sa_func.sum(PostVote.value))
            .filter(PostVote.post_id.in_(post_ids))
            .group_by(PostVote.post_id)
            .all()
        )
        score_map = {row[0]: int(row[1]) for row in score_rows}

        if user:
            vote_rows = (
                db.query(PostVote.post_id, PostVote.value)
                .filter(PostVote.post_id.in_(post_ids), PostVote.user_id == user.id)
                .all()
            )
            user_vote_map = {row[0]: row[1] for row in vote_rows}

    base = _track_to_response(track, post_count or 0, like_count or 0, user_has_liked)

    return TrackDetailResponse(
        **base.model_dump(),
        user_role=get_user_track_role(user, track.id, db),
        posts=_build_post_tree(all_posts, score_map, user_vote_map),
    )


@router.post(
    "/{track_id}/like", status_code=status.HTTP_204_NO_CONTENT, response_class=Response
)
def like_track(
    track_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _get_track_or_404(db, track_id)

    existing = (
        db.query(TrackLike)
        .filter(TrackLike.track_id == track_id, TrackLike.user_id == user.id)
        .first()
    )
    if not existing:
        db.add(TrackLike(track_id=track_id, user_id=user.id))
        db.commit()


@router.delete(
    "/{track_id}/like", status_code=status.HTTP_204_NO_CONTENT, response_class=Response
)
def unlike_track(
    track_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _get_track_or_404(db, track_id)

    existing = (
        db.query(TrackLike)
        .filter(TrackLike.track_id == track_id, TrackLike.user_id == user.id)
        .first()
    )
    if existing:
        db.delete(existing)
        db.commit()
