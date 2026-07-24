from urllib.parse import urlencode
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import httpx

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, get_current_user, AUTH_COOKIE_NAME, AUTH_COOKIE_MAX_AGE, get_cookie_params
from app.models.user import User
from app.schemas.user import UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

# ---------------------------------------------------------------------------
# Google OAuth constants
# ---------------------------------------------------------------------------
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

# Gmail scopes: read emails, send emails, manage drafts
GOOGLE_SCOPES = " ".join([
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/gmail.readonly",   # Read emails
    "https://www.googleapis.com/auth/gmail.send",        # Send emails
    "https://www.googleapis.com/auth/gmail.compose",     # Manage drafts
])


# ---------------------------------------------------------------------------
# Google OAuth — the ONLY login method
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
        "scope": GOOGLE_SCOPES,
        "access_type": "offline",   # Required to get refresh_token
        "prompt": "consent",        # Force consent to always get refresh_token
    }
    url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    return RedirectResponse(url=url)


@router.get("/google/callback")
async def google_callback(code: str = None, error: str = None, db: AsyncSession = Depends(get_db)):
    """
    Handle Google OAuth callback.
    
    1. Exchange authorization code for tokens (including refresh_token)
    2. Fetch user profile from Google
    3. Find or create user in database
    4. Store encrypted refresh token for Gmail API access
    5. Set JWT as HttpOnly cookie and redirect to frontend
    """
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
        google_refresh_token = token_data.get("refresh_token")

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
        result = await db.execute(select(User).filter(User.google_id == google_id))
        user = result.scalars().first()

        if not user:
            # Check by email (existing user from before)
            result = await db.execute(select(User).filter(User.email == email))
            user = result.scalars().first()

            if user:
                # Link Google account to existing user
                user.google_id = google_id
                user.auth_provider = "google"
                if avatar_url:
                    user.avatar_url = avatar_url
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

        # 4. Store encrypted refresh token for Gmail API access
        if google_refresh_token:
            # Import encryption lazily to avoid circular imports at module level
            from app.core.encryption import encrypt_value
            user.encrypted_google_refresh_token = encrypt_value(google_refresh_token)
            user.gmail_connected = True

        # Update avatar if changed
        if avatar_url and user.avatar_url != avatar_url:
            user.avatar_url = avatar_url

        await db.commit()
        await db.refresh(user)

        if not user.is_active:
            return RedirectResponse(
                url=f"{settings.FRONTEND_URL}/login?error=Account is deactivated"
            )

        # 5. Generate JWT and set as HttpOnly cookie
        access_token = create_access_token(data={"sub": user.id})

        redirect = RedirectResponse(
            url=f"{settings.FRONTEND_URL}/auth/callback",
            status_code=status.HTTP_302_FOUND,
        )
        from datetime import datetime, timedelta, timezone
        cookie_params = get_cookie_params()
        redirect.set_cookie(
            **cookie_params,
            value=access_token,
            max_age=AUTH_COOKIE_MAX_AGE,
            expires=datetime.now(timezone.utc) + timedelta(seconds=AUTH_COOKIE_MAX_AGE),
        )
        return redirect

    except httpx.HTTPError as e:
        logger.error(f"HTTP error during Google authentication: {e}", exc_info=True)
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error=Network error during Google sign-in"
        )
    except Exception as e:
        logger.error(f"Unexpected error during Google callback: {e}", exc_info=True)
        return RedirectResponse(
            url=f"{settings.FRONTEND_URL}/login?error=An unexpected error occurred"
        )


# ---------------------------------------------------------------------------
# Session management
# ---------------------------------------------------------------------------

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get the currently authenticated user's profile."""
    return current_user


@router.post("/logout")
async def logout():
    """Clear the auth cookie to log the user out."""
    response = JSONResponse(content={"ok": True})
    cookie_params = get_cookie_params()
    # delete_cookie needs key, path, domain, samesite, httponly, secure
    response.delete_cookie(**cookie_params)
    return response


@router.get("/gmail/status")
async def gmail_status(current_user: User = Depends(get_current_user)):
    """Check if the current user has Gmail connected."""
    return {
        "gmail_connected": current_user.gmail_connected,
        "email": current_user.email,
    }
