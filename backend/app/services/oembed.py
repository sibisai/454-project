"""services/oembed.py — SoundCloud metadata fetcher.

Uses a 3-layer strategy: oEmbed API → OG tag scrape → URL slug parsing.
Embed HTML is always built from the URL (never depends on oEmbed).
"""

import logging
import re
from urllib.parse import quote

import httpx
from fastapi import HTTPException

logger = logging.getLogger(__name__)

_SC_PATH_RE = re.compile(
    r"^https?://soundcloud\.com/([^/]+)/([^/?#]+)",
)

_OG_TITLE_RE = re.compile(
    r'<meta\s[^>]*property="og:title"[^>]*content="([^"]*)"'
    r"|"
    r'<meta\s[^>]*content="([^"]*)"[^>]*property="og:title"',
)
_OG_IMAGE_RE = re.compile(
    r'<meta\s[^>]*property="og:image"[^>]*content="([^"]*)"'
    r"|"
    r'<meta\s[^>]*content="([^"]*)"[^>]*property="og:image"',
)


def _build_embed_html(soundcloud_url: str) -> str:
    """Build an iframe embed from the track URL. Always succeeds."""
    embed_src = (
        f"https://w.soundcloud.com/player/?url={quote(soundcloud_url, safe='')}"
        "&color=%23ff5500&auto_play=false&hide_related=true"
        "&show_comments=false&show_user=true&show_reposts=false&show_teaser=false"
    )
    return (
        f'<iframe width="100%" height="166" scrolling="no" frameborder="no"'
        f' allow="autoplay" src="{embed_src}"></iframe>'
    )


def _metadata_from_url(soundcloud_url: str) -> dict:
    """Layer C: extract artist/title from URL slugs (last resort)."""
    m = _SC_PATH_RE.match(soundcloud_url)
    if not m:
        raise HTTPException(status_code=400, detail="Invalid SoundCloud track URL")
    artist_slug, track_slug = m.group(1), m.group(2)
    title = track_slug.replace("-", " ").title()
    artist = artist_slug.replace("-", " ").title()
    logger.warning("Using URL slug fallback for metadata: %s", soundcloud_url)
    return {"title": title, "artist_name": artist, "artwork_url": None}


async def _try_oembed(client: httpx.AsyncClient, soundcloud_url: str) -> dict | None:
    """Layer A: fetch metadata from SoundCloud's oEmbed API."""
    try:
        resp = await client.get(
            "https://soundcloud.com/oembed",
            params={"format": "json", "url": soundcloud_url},
        )
        if resp.status_code == 200:
            data = resp.json()
            return {
                "title": data["title"],
                "artist_name": data["author_name"],
                "artwork_url": data.get("thumbnail_url"),
            }
        logger.warning("oEmbed returned %d for %s", resp.status_code, soundcloud_url)
    except Exception as exc:
        logger.warning("oEmbed request failed for %s: %s", soundcloud_url, exc)
    return None


async def _try_og_scrape(client: httpx.AsyncClient, soundcloud_url: str) -> dict | None:
    """Layer B: scrape OG meta tags from the track page."""
    try:
        resp = await client.get(soundcloud_url)
        if resp.status_code != 200:
            logger.warning("OG scrape got %d for %s", resp.status_code, soundcloud_url)
            return None

        html = resp.text
        title_match = _OG_TITLE_RE.search(html)
        if not title_match:
            logger.warning("No og:title found for %s", soundcloud_url)
            return None

        og_title = title_match.group(1) or title_match.group(2)

        # og:title is typically "Track Title by Artist Name"
        by_idx = og_title.rfind(" by ")
        if by_idx != -1:
            title = og_title[:by_idx]
            artist = og_title[by_idx + 4:]
        else:
            title = og_title
            m = _SC_PATH_RE.match(soundcloud_url)
            artist = m.group(1).replace("-", " ").title() if m else "Unknown"

        image_match = _OG_IMAGE_RE.search(html)
        artwork_url = (image_match.group(1) or image_match.group(2)) if image_match else None

        return {"title": title, "artist_name": artist, "artwork_url": artwork_url}
    except Exception as exc:
        logger.warning("OG scrape failed for %s: %s", soundcloud_url, exc)
    return None


async def fetch_track_metadata(soundcloud_url: str) -> dict:
    if not _SC_PATH_RE.match(soundcloud_url):
        raise HTTPException(status_code=400, detail="Invalid SoundCloud track URL")

    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        metadata = (
            await _try_oembed(client, soundcloud_url)
            or await _try_og_scrape(client, soundcloud_url)
            or _metadata_from_url(soundcloud_url)
        )

    return {**metadata, "embed_html": _build_embed_html(soundcloud_url)}
