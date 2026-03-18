"""services/oembed.py — SoundCloud metadata fetcher.

Tries the oEmbed endpoint first; falls back to URL parsing when the API
is unavailable (SoundCloud's oEmbed returns 404 as of early 2026).
"""

import re
from urllib.parse import quote

import httpx
from fastapi import HTTPException

_SC_PREFIX = ("https://soundcloud.com/", "http://soundcloud.com/")
_SC_PATH_RE = re.compile(
    r"^https?://soundcloud\.com/([^/]+)/([^/?#]+)",
)


def _metadata_from_url(soundcloud_url: str) -> dict:
    """Extract artist/title from the URL path and build an embed iframe."""
    m = _SC_PATH_RE.match(soundcloud_url)
    if not m:
        raise HTTPException(status_code=400, detail="Invalid SoundCloud track URL")
    artist_slug, track_slug = m.group(1), m.group(2)
    title = track_slug.replace("-", " ").title()
    artist = artist_slug.replace("-", " ").title()
    embed_src = (
        f"https://w.soundcloud.com/player/?url={quote(soundcloud_url, safe='')}"
        "&color=%23ff5500&auto_play=false&hide_related=false"
        "&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"
    )
    embed_html = (
        f'<iframe width="100%" height="166" scrolling="no" frameborder="no"'
        f' allow="autoplay" src="{embed_src}"></iframe>'
    )
    return {
        "title": title,
        "artist_name": artist,
        "artwork_url": None,
        "embed_html": embed_html,
    }


async def fetch_track_metadata(soundcloud_url: str) -> dict:
    if not soundcloud_url.startswith(_SC_PREFIX):
        raise HTTPException(status_code=400, detail="Invalid SoundCloud URL")

    # Verify the track page actually exists on SoundCloud.
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            # Try oEmbed first.
            oembed_resp = await client.get(
                "https://soundcloud.com/oembed",
                params={"format": "json", "url": soundcloud_url},
            )
            if oembed_resp.status_code == 200:
                data = oembed_resp.json()
                return {
                    "title": data["title"],
                    "artist_name": data["author_name"],
                    "artwork_url": data.get("thumbnail_url"),
                    "embed_html": data["html"],
                }

            # oEmbed unavailable — verify the track page exists, then parse URL.
            head_resp = await client.head(soundcloud_url)
            if head_resp.status_code != 200:
                raise HTTPException(
                    status_code=400, detail="SoundCloud track not found"
                )
    except HTTPException:
        raise
    except (httpx.TimeoutException, httpx.ConnectError):
        raise HTTPException(status_code=502, detail="SoundCloud is unreachable")

    return _metadata_from_url(soundcloud_url)
