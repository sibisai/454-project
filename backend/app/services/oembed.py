"""
services/oembed.py — SoundCloud oEmbed fetcher.

Provides a function to:
  - Accept a SoundCloud track URL
  - Call the SoundCloud oEmbed API
  - Return the embeddable HTML player snippet
  - Cache results to reduce external API calls
"""
