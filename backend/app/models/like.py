"""models/like.py — SQLAlchemy TrackLike and PostVote models."""

from sqlalchemy import Column, DateTime, ForeignKey, SmallInteger
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from .base import Base


class TrackLike(Base):
    __tablename__ = "track_likes"

    track_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tracks.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PostVote(Base):
    __tablename__ = "post_votes"

    post_id = Column(
        UUID(as_uuid=True),
        ForeignKey("posts.id", ondelete="CASCADE"),
        primary_key=True,
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    value = Column(SmallInteger, nullable=False)  # +1 or -1
    created_at = Column(DateTime(timezone=True), server_default=func.now())
