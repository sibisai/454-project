"""
models/user.py — SQLAlchemy User model.
"""

from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from .base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    display_name = Column(String(100), unique=True, index=True, nullable=False)
    global_role = Column(String(20), server_default="user", nullable=False)
    is_banned = Column(Boolean, server_default="false", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
