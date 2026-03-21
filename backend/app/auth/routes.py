from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.jwt import create_access_token, create_refresh_token, decode_token
from app.auth.passwords import hash_password, verify_password
from app.auth.schemas import LoginRequest, RefreshRequest, RefreshResponse, RegisterRequest, TokenResponse, UserResponse
from app.middleware.rate_limit import check_rate_limit, clear_attempts, record_failed_attempt
from app.middleware.rbac import get_current_user, resolve_user
from app.models import User, get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        display_name=body.display_name,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        if "ix_users_email" in str(exc.orig):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
        if "ix_users_display_name" in str(exc.orig):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Display name already taken")
        raise
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    check_rate_limit(request)

    user = db.query(User).filter(User.email == body.email.lower().strip()).first()
    if not user:
        record_failed_attempt(request)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended",
        )
    if not verify_password(body.password, user.password_hash):
        record_failed_attempt(request)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    clear_attempts(request)
    access_token = create_access_token(str(user.id), user.global_role)
    refresh_token = create_refresh_token(str(user.id))
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)):
    return user


@router.post("/refresh", response_model=RefreshResponse)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    payload = decode_token(body.refresh_token, expected_type="refresh")
    user = resolve_user(payload, db)
    # TODO: invalidate old refresh token — rotation without revocation leaves
    # the previous token valid until expiry. Needs a server-side token store.
    return {
        "access_token": create_access_token(str(user.id), user.global_role),
        "refresh_token": create_refresh_token(str(user.id)),
    }
