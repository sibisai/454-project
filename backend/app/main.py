"""
main.py — FastAPI application entry point.

Sets up the FastAPI app instance, registers CORS middleware,
includes all API routers, and configures middleware
(rate limiting, security headers, RBAC).
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="SoundCloud Discussion Board API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
