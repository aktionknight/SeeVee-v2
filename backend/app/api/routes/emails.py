from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.email import Email
from app.schemas.email import EmailCreate, EmailUpdate, EmailResponse
from app.services.gmail_service import (
    send_email,
    list_emails,
    get_email,
    create_draft,
    list_drafts,
    get_draft,
    update_draft,
    delete_draft,
    send_draft,
    check_gmail_connection,
    GmailServiceError,
)

router = APIRouter(prefix="/emails", tags=["Emails"])


# ---------------------------------------------------------------------------
# Helper: get decrypted refresh token for current user
# ---------------------------------------------------------------------------

def _get_refresh_token(user: User) -> str:
    """Decrypt and return the user's Google refresh token."""
    if not user.gmail_connected or not user.encrypted_google_refresh_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gmail is not connected. Please sign in with Google again to grant Gmail permissions.",
        )

    from app.core.encryption import decrypt_value
    try:
        return decrypt_value(user.encrypted_google_refresh_token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to decrypt Gmail credentials. Please reconnect your Google account.",
        )


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class SendEmailRequest(BaseModel):
    to: str
    subject: str
    body_html: str
    body_text: Optional[str] = None


class DraftRequest(BaseModel):
    to: str
    subject: str
    body_html: str
    body_text: Optional[str] = None


# ---------------------------------------------------------------------------
# Gmail: Send email
# ---------------------------------------------------------------------------

@router.post("/send")
async def send_email_endpoint(
    req: SendEmailRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send an email via the user's Gmail account."""
    refresh_token = _get_refresh_token(current_user)

    try:
        result = await send_email(
            refresh_token=refresh_token,
            to=req.to,
            subject=req.subject,
            body_html=req.body_html,
            body_text=req.body_text,
        )

        # Save a record of the sent email in our database
        db_email = Email(
            recipient_email=req.to,
            subject=req.subject,
            body=req.body_html,
            status="sent",
        )
        db.add(db_email)
        await db.commit()

        return {
            "ok": True,
            "gmail_message_id": result.get("id"),
            "thread_id": result.get("threadId"),
        }
    except GmailServiceError as e:
        status_code = status.HTTP_401_UNAUTHORIZED if e.requires_reauth else status.HTTP_502_BAD_GATEWAY
        raise HTTPException(status_code=status_code, detail=str(e))


# ---------------------------------------------------------------------------
# Gmail: Read emails
# ---------------------------------------------------------------------------

@router.get("/gmail/messages")
async def list_gmail_messages(
    max_results: int = 20,
    query: str = "",
    page_token: Optional[str] = None,
    current_user: User = Depends(get_current_user),
):
    """List emails from the user's Gmail inbox."""
    refresh_token = _get_refresh_token(current_user)

    try:
        return await list_emails(
            refresh_token=refresh_token,
            max_results=max_results,
            query=query,
            page_token=page_token,
        )
    except GmailServiceError as e:
        status_code = status.HTTP_401_UNAUTHORIZED if e.requires_reauth else status.HTTP_502_BAD_GATEWAY
        raise HTTPException(status_code=status_code, detail=str(e))


@router.get("/gmail/messages/{message_id}")
async def get_gmail_message(
    message_id: str,
    format: str = "metadata",
    current_user: User = Depends(get_current_user),
):
    """Get a single email message from Gmail."""
    refresh_token = _get_refresh_token(current_user)

    try:
        return await get_email(
            refresh_token=refresh_token,
            message_id=message_id,
            format=format,
        )
    except GmailServiceError as e:
        status_code = status.HTTP_401_UNAUTHORIZED if e.requires_reauth else status.HTTP_502_BAD_GATEWAY
        raise HTTPException(status_code=status_code, detail=str(e))


# ---------------------------------------------------------------------------
# Gmail: Draft management
# ---------------------------------------------------------------------------

@router.post("/gmail/drafts")
async def create_gmail_draft(
    req: DraftRequest,
    current_user: User = Depends(get_current_user),
):
    """Create a new draft in the user's Gmail."""
    refresh_token = _get_refresh_token(current_user)

    try:
        return await create_draft(
            refresh_token=refresh_token,
            to=req.to,
            subject=req.subject,
            body_html=req.body_html,
            body_text=req.body_text,
        )
    except GmailServiceError as e:
        status_code = status.HTTP_401_UNAUTHORIZED if e.requires_reauth else status.HTTP_502_BAD_GATEWAY
        raise HTTPException(status_code=status_code, detail=str(e))


@router.get("/gmail/drafts")
async def list_gmail_drafts(
    max_results: int = 20,
    page_token: Optional[str] = None,
    current_user: User = Depends(get_current_user),
):
    """List drafts from the user's Gmail."""
    refresh_token = _get_refresh_token(current_user)

    try:
        return await list_drafts(
            refresh_token=refresh_token,
            max_results=max_results,
            page_token=page_token,
        )
    except GmailServiceError as e:
        status_code = status.HTTP_401_UNAUTHORIZED if e.requires_reauth else status.HTTP_502_BAD_GATEWAY
        raise HTTPException(status_code=status_code, detail=str(e))


@router.get("/gmail/drafts/{draft_id}")
async def get_gmail_draft(
    draft_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get a single draft by ID."""
    refresh_token = _get_refresh_token(current_user)

    try:
        return await get_draft(
            refresh_token=refresh_token,
            draft_id=draft_id,
        )
    except GmailServiceError as e:
        status_code = status.HTTP_401_UNAUTHORIZED if e.requires_reauth else status.HTTP_502_BAD_GATEWAY
        raise HTTPException(status_code=status_code, detail=str(e))


@router.put("/gmail/drafts/{draft_id}")
async def update_gmail_draft(
    draft_id: str,
    req: DraftRequest,
    current_user: User = Depends(get_current_user),
):
    """Update an existing draft."""
    refresh_token = _get_refresh_token(current_user)

    try:
        return await update_draft(
            refresh_token=refresh_token,
            draft_id=draft_id,
            to=req.to,
            subject=req.subject,
            body_html=req.body_html,
            body_text=req.body_text,
        )
    except GmailServiceError as e:
        status_code = status.HTTP_401_UNAUTHORIZED if e.requires_reauth else status.HTTP_502_BAD_GATEWAY
        raise HTTPException(status_code=status_code, detail=str(e))


@router.delete("/gmail/drafts/{draft_id}")
async def delete_gmail_draft(
    draft_id: str,
    current_user: User = Depends(get_current_user),
):
    """Delete a draft permanently."""
    refresh_token = _get_refresh_token(current_user)

    try:
        await delete_draft(
            refresh_token=refresh_token,
            draft_id=draft_id,
        )
        return {"ok": True}
    except GmailServiceError as e:
        status_code = status.HTTP_401_UNAUTHORIZED if e.requires_reauth else status.HTTP_502_BAD_GATEWAY
        raise HTTPException(status_code=status_code, detail=str(e))


@router.post("/gmail/drafts/{draft_id}/send")
async def send_gmail_draft(
    draft_id: str,
    current_user: User = Depends(get_current_user),
):
    """Send an existing draft."""
    refresh_token = _get_refresh_token(current_user)

    try:
        return await send_draft(
            refresh_token=refresh_token,
            draft_id=draft_id,
        )
    except GmailServiceError as e:
        status_code = status.HTTP_401_UNAUTHORIZED if e.requires_reauth else status.HTTP_502_BAD_GATEWAY
        raise HTTPException(status_code=status_code, detail=str(e))


@router.get("/gmail/connection")
async def check_connection(
    current_user: User = Depends(get_current_user),
):
    """Verify Gmail API connection by fetching the user's Gmail profile."""
    refresh_token = _get_refresh_token(current_user)

    try:
        return await check_gmail_connection(refresh_token)
    except GmailServiceError as e:
        status_code = status.HTTP_401_UNAUTHORIZED if e.requires_reauth else status.HTTP_502_BAD_GATEWAY
        raise HTTPException(status_code=status_code, detail=str(e))


# ---------------------------------------------------------------------------
# Local email records (database CRUD — kept for tracking)
# ---------------------------------------------------------------------------

@router.post("/", response_model=EmailResponse)
async def create_email_record(
    email: EmailCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    db_email = Email(**email.model_dump())
    db.add(db_email)
    await db.commit()
    await db.refresh(db_email)
    return db_email


@router.get("/", response_model=list[EmailResponse])
async def list_email_records(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Email).offset(skip).limit(limit))
    return result.scalars().all()


@router.get("/{email_id}", response_model=EmailResponse)
async def get_email_record(
    email_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Email).filter(Email.id == email_id))
    db_email = result.scalars().first()
    if db_email is None:
        raise HTTPException(status_code=404, detail="Email not found")
    return db_email


@router.put("/{email_id}", response_model=EmailResponse)
async def update_email_record(
    email_id: int,
    email: EmailUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Email).filter(Email.id == email_id))
    db_email = result.scalars().first()
    if db_email is None:
        raise HTTPException(status_code=404, detail="Email not found")

    for key, value in email.model_dump(exclude_unset=True).items():
        setattr(db_email, key, value)

    await db.commit()
    await db.refresh(db_email)
    return db_email


@router.delete("/{email_id}")
async def delete_email_record(
    email_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Email).filter(Email.id == email_id))
    db_email = result.scalars().first()
    if db_email is None:
        raise HTTPException(status_code=404, detail="Email not found")

    await db.delete(db_email)
    await db.commit()
    return {"ok": True}
