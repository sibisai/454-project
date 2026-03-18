"""routes/schemas.py — Pydantic models for track and post endpoints."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TrackCreateRequest(BaseModel):
    soundcloud_url: str


class PostCreateRequest(BaseModel):
    content: str = Field(min_length=1, max_length=5000)


class PostUpdateRequest(BaseModel):
    content: str = Field(min_length=1, max_length=5000)


class TrackResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    soundcloud_url: str
    title: str
    artist_name: str
    artwork_url: str | None
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
    parent_id: UUID | None
    content: str
    is_pinned: bool
    is_removed: bool
    created_at: datetime
    updated_at: datetime | None
    replies: list[PostResponse] = []


class TrackDetailResponse(TrackResponse):
    user_role: str | None
    posts: list[PostResponse]


class PaginatedTracksResponse(BaseModel):
    tracks: list[TrackResponse]
    total: int
    page: int
    per_page: int


class ModeratorResponse(BaseModel):
    user_id: UUID
    display_name: str


class ModeratorDetailResponse(ModeratorResponse):
    email: str
    delegated_by: UUID
    delegated_by_display_name: str
    created_at: datetime


class ModeratorListResponse(BaseModel):
    moderators: list[ModeratorDetailResponse | ModeratorResponse]
    track_id: UUID


class MessageResponse(BaseModel):
    message: str
