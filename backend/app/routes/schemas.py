"""routes/schemas.py — Pydantic models for track and post endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class TrackCreateRequest(BaseModel):
    soundcloud_url: str


class TrackResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    soundcloud_url: str
    title: str
    artist_name: str
    artwork_url: Optional[str]
    embed_html: str
    posted_by: UUID
    poster_display_name: str
    post_count: int
    created_at: datetime


class PostResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    track_id: UUID
    author_id: UUID
    author_display_name: str
    parent_id: Optional[UUID]
    content: str
    is_pinned: bool
    is_removed: bool
    created_at: datetime
    updated_at: Optional[datetime]
    replies: list[PostResponse] = []


class TrackDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    soundcloud_url: str
    title: str
    artist_name: str
    artwork_url: Optional[str]
    embed_html: str
    posted_by: UUID
    poster_display_name: str
    post_count: int
    created_at: datetime
    user_role: Optional[str]
    posts: list[PostResponse]


class PaginatedTracksResponse(BaseModel):
    tracks: list[TrackResponse]
    total: int
    page: int
    per_page: int
