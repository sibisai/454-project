"""
models/post.py — SQLAlchemy Post model.
"""

from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .base import Base


class Post(Base):
    __tablename__ = "posts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    track_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tracks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    author_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    parent_id = Column(
        UUID(as_uuid=True),
        ForeignKey("posts.id", ondelete="CASCADE"),
        nullable=True,
    )
    content = Column(Text, nullable=False)
    is_pinned = Column(Boolean, server_default="false", nullable=False)
    is_removed = Column(Boolean, server_default="false", nullable=False)
    removed_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    track = relationship("Track", back_populates="posts")
    author = relationship("User", foreign_keys=[author_id])
    remover = relationship("User", foreign_keys=[removed_by])
    parent = relationship("Post", remote_side=[id], back_populates="replies")
    replies = relationship(
        "Post", back_populates="parent", order_by="Post.created_at"
    )
