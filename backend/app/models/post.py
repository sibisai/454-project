"""
models/post.py — SQLAlchemy Post model.

Defines the Post table with fields:
  - id, body, author_id (FK to User), track_id (FK to Track)
  - parent_id (FK to Post, nullable — for threaded replies)
  - created_at, updated_at
"""
