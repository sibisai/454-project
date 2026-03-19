"""routes/helpers.py — Shared utilities for route handlers."""

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import User


def get_user_or_404(user_id: UUID, db: Session) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user
