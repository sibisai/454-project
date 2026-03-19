"""Seed script — creates an admin user if none exists.

Usage:
    docker compose exec backend python -m app.seed_admin
"""

from app.auth.passwords import hash_password
from app.models import User, get_db

ADMIN_EMAIL = "admin@soundcloud-discuss.com"
ADMIN_PASSWORD = "Admin123!"
ADMIN_DISPLAY_NAME = "Admin"


def main() -> None:
    db = next(get_db())
    try:
        existing = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if existing:
            print(f"Admin user already exists: {ADMIN_EMAIL}")
            return

        admin = User(
            email=ADMIN_EMAIL,
            password_hash=hash_password(ADMIN_PASSWORD),
            display_name=ADMIN_DISPLAY_NAME,
            global_role="admin",
        )
        db.add(admin)
        db.commit()
        print(f"Admin user created: {ADMIN_EMAIL} (password: {ADMIN_PASSWORD})")
    finally:
        db.close()


if __name__ == "__main__":
    main()
