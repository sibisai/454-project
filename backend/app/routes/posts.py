"""routes/posts.py — Discussion post CRUD API endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.middleware.rbac import get_current_user, get_user_track_role
from app.models import Post, Track, User, get_db
from app.routes.schemas import PostCreateRequest, PostResponse, PostUpdateRequest
from app.services.audit import ACTION_POST_REMOVED, log_action

router = APIRouter(tags=["posts"])


def post_to_response(post: Post) -> PostResponse:
    return PostResponse(
        id=post.id,
        track_id=post.track_id,
        author_id=post.author_id,
        author_display_name="[removed]" if post.is_removed else post.author.display_name,
        parent_id=post.parent_id,
        content="[removed]" if post.is_removed else post.content,
        is_pinned=post.is_pinned,
        is_removed=post.is_removed,
        created_at=post.created_at,
        updated_at=post.updated_at,
        replies=[post_to_response(r) for r in post.replies],
    )


@router.post(
    "/api/tracks/{track_id}/posts",
    response_model=PostResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_post(
    track_id: UUID,
    body: PostCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Track not found")

    post = Post(track_id=track_id, author_id=user.id, content=body.content)
    db.add(post)
    db.commit()
    db.refresh(post)
    return post_to_response(post)


@router.post(
    "/api/posts/{post_id}/replies",
    response_model=PostResponse,
    status_code=status.HTTP_201_CREATED,
)
def reply_to_post(
    post_id: UUID,
    body: PostCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    parent = db.query(Post).filter(Post.id == post_id).first()
    if not parent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    if parent.is_removed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot reply to a removed post",
        )

    post = Post(
        track_id=parent.track_id,
        author_id=user.id,
        parent_id=post_id,
        content=body.content,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post_to_response(post)


@router.put("/api/posts/{post_id}", response_model=PostResponse)
def edit_post(
    post_id: UUID,
    body: PostUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    if post.is_removed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot edit a removed post",
        )
    if post.author_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the author can edit this post",
        )

    post.content = body.content
    post.updated_at = func.now()
    db.commit()
    db.refresh(post)
    return post_to_response(post)


@router.delete("/api/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    if post.is_removed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Post is already removed",
        )

    is_author = post.author_id == user.id
    role = get_user_track_role(user, post.track_id, db)
    is_moderator = role in ("admin", "artist", "moderator")

    if not is_author and not is_moderator:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to remove this post",
        )

    post.is_removed = True
    post.removed_by = user.id

    if not is_author:
        log_action(
            db,
            actor_id=user.id,
            action=ACTION_POST_REMOVED,
            target_type="post",
            target_id=post.id,
            details={
                "track_id": str(post.track_id),
                "removed_by_role": role,
                "post_author_id": str(post.author_id),
                "content_preview": post.content[:100],
            },
        )

    db.commit()
