"""FastAPI application entry point."""

# Database schema is managed by Alembic migrations — do not use create_all() here.

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth.routes import router as auth_router
from app.routes.admin import router as admin_router
from app.routes.moderation import router as moderation_router
from app.routes.posts import router as posts_router
from app.routes.tracks import router as tracks_router

app = FastAPI(title="SoundCloud Discussion Board API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin_router)
app.include_router(auth_router)
app.include_router(moderation_router)
app.include_router(posts_router)
app.include_router(tracks_router)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
