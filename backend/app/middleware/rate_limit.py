"""
In-memory sliding-window rate limiting for login attempts.

Resets on server restart. For production, swap to Redis or a distributed
store. Infrastructure-level rate limiting (e.g. AWS WAF) provides
defense in depth alongside this application-level check.

Note: not thread-safe. CPython's GIL prevents corruption for dict ops,
but under true concurrency a threading.Lock would be needed.
"""

import time
from collections import defaultdict

from fastapi import HTTPException, Request

MAX_ATTEMPTS = 5
WINDOW_SECONDS = 60

_attempts: dict[str, list[float]] = defaultdict(list)


def _get_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def check_rate_limit(request: Request) -> None:
    ip = _get_ip(request)
    cutoff = time.monotonic() - WINDOW_SECONDS
    _attempts[ip] = [t for t in _attempts[ip] if t > cutoff]
    if not _attempts[ip]:
        del _attempts[ip]
        return
    if len(_attempts[ip]) >= MAX_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail=f"Too many login attempts. Try again in {WINDOW_SECONDS} seconds.",
            headers={"Retry-After": str(WINDOW_SECONDS)},
        )


def record_failed_attempt(request: Request) -> None:
    _attempts[_get_ip(request)].append(time.monotonic())


def clear_attempts(request: Request) -> None:
    _attempts.pop(_get_ip(request), None)
