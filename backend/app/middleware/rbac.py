"""
middleware/rbac.py — Role-based access control middleware.

Provides dependency functions for:
  - Global role checking (admin, moderator, artist, listener)
  - Per-track scoped permission checking (track moderator/artist)
  - Extracting and validating the current user from JWT
"""
