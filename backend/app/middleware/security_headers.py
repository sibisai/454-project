"""Security headers middleware.

Adds OWASP-recommended security headers to every response.
CSP whitelists SoundCloud widget domains for iframes, scripts, and artwork.
"""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

SECURITY_HEADERS = {
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Content-Security-Policy": (
        "default-src 'self'; "
        "frame-src https://w.soundcloud.com; "
        "script-src 'self' https://w.soundcloud.com; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' https://*.sndcdn.com data:; "
        "connect-src 'self'; "
        "media-src https://w.soundcloud.com"
    ),
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        for header, value in SECURITY_HEADERS.items():
            response.headers[header] = value
        return response
