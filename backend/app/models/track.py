"""
models/track.py — SQLAlchemy Track model.
"""

from uuid import uuid4

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .base import Base


class Track(Base):
    __tablename__ = "tracks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    soundcloud_url = Column(String(500), unique=True, nullable=False)
    title = Column(String(300), nullable=False)
    artist_name = Column(String(200), nullable=False)
    artwork_url = Column(String(500), nullable=True)
    embed_html = Column(Text, nullable=False)
    posted_by = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    poster = relationship("User", foreign_keys=[posted_by])
    posts = relationship("Post", back_populates="track", cascade="all, delete-orphan")
