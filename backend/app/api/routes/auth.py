from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import httpx

from app.core.config import settings
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, get_current_user
from app.models.user import User
from app.schemas.user import UserCreate, LoginRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

# ---------------------------------------------------------------------------
# Google OAuth constants
# ---------------------------------------------------------------------------
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


# ---------------------------------------------------------------------------
# Email / Password auth
# ---------------------------------------------------------------------------

@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if user already exists
    result = await db.execute(select(User).filter(User.email == user_data.email))
    existing_user = result.scalars().first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    # Create user
    new_user = User(
        email=user_data.email,
        name=user_data.name,
        hashed_password=hash_password(user_data.password),
        auth_provider="local",
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Generate token
    access_token = create_access_token(data={"sub": new_user.id})

    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(new_user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(login_data: LoginRequest, db: AsyncSession = Depends(get_db)):
    # Find user
    result = await db.execute(select(User).filter(User.email == login_data.email))
    user = result.scalars().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # If user signed up with Google and has no password
    if user.auth_provider == "google" and not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account uses Google sign-in. Please use 'Continue with Google' instead.",
        )

    if not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    # Generate token
    access_token = create_access_token(data={"sub": user.id})

    return TokenResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# ---------------------------------------------------------------------------
# Google OAuth
# ---------------------------------------------------------------------------

@router.get("/google/login")
async def google_login():
    """Redirect user to Google's OAuth consent screen."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env",
        )

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    return RedirectResponse(url=url)


@router.get("/google/callback")
async def google_callback(code: str = None, error: str = None, db: AsyncSession = Depends(get_db)):
    """Handle Google OAuth callback — exchange code for tokens, find/create user."""
    # Handle denied access
    if error:
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error=Google sign-in was cancelled"
        )

    if not code:
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error=No authorization code received"
        )

    try:
        # 1. Exchange authorization code for tokens
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "code": code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                    "grant_type": "authorization_code",
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )

        if token_response.status_code != 200:
            return RedirectResponse(
                url=f"{settings.FRONTEND_URL}/login?error=Failed to authenticate with Google"
            )

        token_data = token_response.json()
        google_access_token = token_data.get("access_token")

        if not google_access_token:
            return RedirectResponse(
                url=f"{settings.FRONTEND_URL}/login?error=Failed to get access token from Google"
            )

        # 2. Fetch user info from Google
        async with httpx.AsyncClient() as client:
            userinfo_response = await client.get(
                GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {google_access_token}"},
            )

        if userinfo_response.status_code != 200:
            return RedirectResponse(
                url=f"{settings.FRONTEND_URL}/login?error=Failed to get user info from Google"
            )

        google_user = userinfo_response.json()
        google_id = google_user.get("id")
        email = google_user.get("email", "").lower().strip()
        name = google_user.get("name", email.split("@")[0])
        avatar_url = google_user.get("picture")

        if not email:
            return RedirectResponse(
                url=f"{settings.FRONTEND_URL}/login?error=No email received from Google"
            )

        # 3. Find or create user
        # First, check by google_id
        result = await db.execute(select(User).filter(User.google_id == google_id))
        user = result.scalars().first()

        if not user:
            # Check by email (user may have signed up with email/password first)
            result = await db.execute(select(User).filter(User.email == email))
            user = result.scalars().first()

            if user:
                # Link Google account to existing user
                user.google_id = google_id
                user.auth_provider = "google" if not user.hashed_password else user.auth_provider
                if avatar_url:
                    user.avatar_url = avatar_url
                await db.commit()
                await db.refresh(user)
            else:
                # Create new user
                user = User(
                    email=email,
                    name=name,
                    google_id=google_id,
                    auth_provider="google",
                    avatar_url=avatar_url,
                    hashed_password=None,
                )
                db.add(user)
                await db.commit()
                await db.refresh(user)

        if not user.is_active:
            return RedirectResponse(
                url=f"{settings.FRONTEND_URL}/login?error=Account is deactivated"
            )

        # 4. Generate JWT and redirect to frontend
        access_token = create_access_token(data={"sub": user.id})

        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/auth/callback?token={access_token}"
        )

    except httpx.HTTPError:
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error=Network error during Google sign-in"
        )
    except Exception:
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error=An unexpected error occurred"
        )
