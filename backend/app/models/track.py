"""
models/track.py — SQLAlchemy Track model.

Defines the Track table with fields:
  - id, title, artist_name, soundcloud_url
  - oembed_html (cached embed player HTML)
  - submitted_by (FK to User), created_at, updated_at
"""
