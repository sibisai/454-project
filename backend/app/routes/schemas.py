"""routes/schemas.py — Pydantic models for track and post endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class TrackCreateRequest(BaseModel):
    soundcloud_url: str


class VoteRequest(BaseModel):
    value: Literal[1, -1]


class PostCreateRequest(BaseModel):
    content: str = Field(min_length=1, max_length=5000)


PostUpdateRequest = PostCreateRequest


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
    like_count: int = 0
    user_has_liked: bool = False
    created_at: datetime


class PostResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    track_id: UUID
    author_id: UUID
    author_display_name: str
    author_global_role: str = "user"
    parent_id: UUID | None
    content: str
    is_pinned: bool
    is_removed: bool
    score: int = 0
    user_vote: int = 0
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


class AdminUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    display_name: str
    global_role: str
    is_banned: bool
    created_at: datetime
    track_count: int
    post_count: int


class RoleChangeRequest(BaseModel):
    role: Literal["user", "admin"]


class PaginatedUsersResponse(BaseModel):
    users: list[AdminUserResponse]
    total: int
    page: int
    per_page: int


class AuditLogResponse(BaseModel):
    id: UUID
    actor_id: UUID
    actor_display_name: str
    action: str
    target_type: str
    target_id: UUID
    details: dict | None
    created_at: datetime


class PaginatedAuditLogResponse(BaseModel):
    entries: list[AuditLogResponse]
    total: int
    page: int
    per_page: int


class AdminStatsResponse(BaseModel):
    total_users: int
    total_tracks: int
    total_posts: int
    total_removed_posts: int
    banned_users: int
    total_moderators: int
    recent_actions: list[AuditLogResponse]


# ── Analytics ──


class TimeSeriesPoint(BaseModel):
    date: str
    count: int


class AnalyticsResponse(BaseModel):
    users_per_day: list[TimeSeriesPoint]
    posts_per_day: list[TimeSeriesPoint]
    mod_actions_per_day: list[TimeSeriesPoint]
    tracks_per_day: list[TimeSeriesPoint]


class TopTrackResponse(BaseModel):
    track_id: UUID
    title: str
    artist_name: str
    post_count: int
    unique_commenters: int


class UserSearchResult(BaseModel):
    id: UUID
    display_name: str


# ── User Profile ──


class UserProfileResponse(BaseModel):
    id: UUID
    display_name: str
    created_at: datetime
    track_count: int
    post_count: int
    email: str | None = None
    global_role: str | None = None
    is_banned: bool | None = None


class UserTrackSummary(BaseModel):
    id: UUID
    title: str
    artist_name: str
    post_count: int
    created_at: datetime


class PaginatedUserTracksResponse(BaseModel):
    tracks: list[UserTrackSummary]
    total: int
    page: int
    per_page: int


class UserPostSummary(BaseModel):
    id: UUID
    content: str
    track_id: UUID
    track_title: str
    score: int = 0
    created_at: datetime


class PaginatedUserPostsResponse(BaseModel):
    posts: list[UserPostSummary]
    total: int
    page: int
    per_page: int


# ── Dashboard ──


class ModeratedTrackSummary(BaseModel):
    id: UUID
    title: str
    artist_name: str
    post_count: int


class DashboardStats(BaseModel):
    tracks_posted: int
    posts_written: int
    tracks_moderated: int


class UserDashboardResponse(BaseModel):
    my_tracks: list[UserTrackSummary]
    moderated_tracks: list[ModeratedTrackSummary]
    recent_activity: list[UserPostSummary]
    stats: DashboardStats
