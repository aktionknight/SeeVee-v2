"""
Gmail Service — Read, Send, and Draft management via Gmail API.

Uses the user's stored Google OAuth refresh token to obtain fresh
access tokens and interact with the Gmail API on behalf of the user.
"""

import base64
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

import httpx

from app.core.config import settings

# ---------------------------------------------------------------------------
# Google OAuth token endpoint
# ---------------------------------------------------------------------------
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"


class GmailServiceError(Exception):
    """Raised when a Gmail API operation fails."""

    def __init__(self, message: str, requires_reauth: bool = False):
        super().__init__(message)
        self.requires_reauth = requires_reauth


async def _refresh_access_token(refresh_token: str) -> str:
    """Exchange a refresh token for a fresh access token."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

    if response.status_code != 200:
        error_data = response.json()
        error_code = error_data.get("error", "")
        if error_code in ("invalid_grant", "invalid_client"):
            raise GmailServiceError(
                "Google authorization has expired. Please reconnect your Google account.",
                requires_reauth=True,
            )
        raise GmailServiceError(
            f"Failed to refresh Google access token: {error_data.get('error_description', error_code)}"
        )

    return response.json()["access_token"]


def _build_auth_headers(access_token: str) -> dict:
    return {"Authorization": f"Bearer {access_token}"}


# ---------------------------------------------------------------------------
# Send Email
# ---------------------------------------------------------------------------


async def send_email(
    refresh_token: str,
    to: str,
    subject: str,
    body_html: str,
    body_text: Optional[str] = None,
) -> dict:
    """
    Send an email via the Gmail API.

    Returns the Gmail API message resource (id, threadId, labelIds).
    """
    access_token = await _refresh_access_token(refresh_token)

    # Build MIME message
    message = MIMEMultipart("alternative")
    message["To"] = to
    message["Subject"] = subject

    if body_text:
        message.attach(MIMEText(body_text, "plain"))
    message.attach(MIMEText(body_html, "html"))

    # Base64url-encode the message
    raw = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{GMAIL_API_BASE}/messages/send",
            json={"raw": raw},
            headers=_build_auth_headers(access_token),
        )

    if response.status_code == 401:
        raise GmailServiceError(
            "Google authorization has expired. Please reconnect your Google account.",
            requires_reauth=True,
        )

    if response.status_code != 200:
        raise GmailServiceError(
            f"Failed to send email: {response.text}"
        )

    return response.json()


# ---------------------------------------------------------------------------
# Read Emails (list + get)
# ---------------------------------------------------------------------------


async def list_emails(
    refresh_token: str,
    max_results: int = 20,
    query: str = "",
    page_token: Optional[str] = None,
    label_ids: Optional[list[str]] = None,
) -> dict:
    """
    List email message IDs from the user's mailbox.

    Returns: { "messages": [...], "nextPageToken": "...", "resultSizeEstimate": N }
    """
    access_token = await _refresh_access_token(refresh_token)

    params: dict = {"maxResults": max_results}
    if query:
        params["q"] = query
    if page_token:
        params["pageToken"] = page_token
    if label_ids:
        # Gmail API expects repeated labelIds params
        params["labelIds"] = label_ids

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{GMAIL_API_BASE}/messages",
            params=params,
            headers=_build_auth_headers(access_token),
        )

    if response.status_code == 401:
        raise GmailServiceError(
            "Google authorization has expired. Please reconnect your Google account.",
            requires_reauth=True,
        )

    if response.status_code != 200:
        raise GmailServiceError(f"Failed to list emails: {response.text}")

    return response.json()


async def get_email(
    refresh_token: str,
    message_id: str,
    format: str = "metadata",
) -> dict:
    """
    Get a single email message.

    format: "full", "metadata", "minimal", or "raw"
    """
    access_token = await _refresh_access_token(refresh_token)

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{GMAIL_API_BASE}/messages/{message_id}",
            params={"format": format},
            headers=_build_auth_headers(access_token),
        )

    if response.status_code == 401:
        raise GmailServiceError(
            "Google authorization has expired. Please reconnect your Google account.",
            requires_reauth=True,
        )

    if response.status_code != 200:
        raise GmailServiceError(f"Failed to get email: {response.text}")

    return response.json()


# ---------------------------------------------------------------------------
# Draft Management
# ---------------------------------------------------------------------------


async def create_draft(
    refresh_token: str,
    to: str,
    subject: str,
    body_html: str,
    body_text: Optional[str] = None,
) -> dict:
    """Create a new draft in the user's mailbox."""
    access_token = await _refresh_access_token(refresh_token)

    # Build MIME message
    message = MIMEMultipart("alternative")
    message["To"] = to
    message["Subject"] = subject

    if body_text:
        message.attach(MIMEText(body_text, "plain"))
    message.attach(MIMEText(body_html, "html"))

    raw = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{GMAIL_API_BASE}/drafts",
            json={"message": {"raw": raw}},
            headers=_build_auth_headers(access_token),
        )

    if response.status_code == 401:
        raise GmailServiceError(
            "Google authorization has expired. Please reconnect your Google account.",
            requires_reauth=True,
        )

    if response.status_code != 200:
        raise GmailServiceError(f"Failed to create draft: {response.text}")

    return response.json()


async def list_drafts(
    refresh_token: str,
    max_results: int = 20,
    page_token: Optional[str] = None,
) -> dict:
    """List drafts in the user's mailbox."""
    access_token = await _refresh_access_token(refresh_token)

    params: dict = {"maxResults": max_results}
    if page_token:
        params["pageToken"] = page_token

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{GMAIL_API_BASE}/drafts",
            params=params,
            headers=_build_auth_headers(access_token),
        )

    if response.status_code == 401:
        raise GmailServiceError(
            "Google authorization has expired. Please reconnect your Google account.",
            requires_reauth=True,
        )

    if response.status_code != 200:
        raise GmailServiceError(f"Failed to list drafts: {response.text}")

    return response.json()


async def get_draft(
    refresh_token: str,
    draft_id: str,
    format: str = "full",
) -> dict:
    """Get a single draft by ID."""
    access_token = await _refresh_access_token(refresh_token)

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{GMAIL_API_BASE}/drafts/{draft_id}",
            params={"format": format},
            headers=_build_auth_headers(access_token),
        )

    if response.status_code == 401:
        raise GmailServiceError(
            "Google authorization has expired. Please reconnect your Google account.",
            requires_reauth=True,
        )

    if response.status_code != 200:
        raise GmailServiceError(f"Failed to get draft: {response.text}")

    return response.json()


async def update_draft(
    refresh_token: str,
    draft_id: str,
    to: str,
    subject: str,
    body_html: str,
    body_text: Optional[str] = None,
) -> dict:
    """Update an existing draft."""
    access_token = await _refresh_access_token(refresh_token)

    message = MIMEMultipart("alternative")
    message["To"] = to
    message["Subject"] = subject

    if body_text:
        message.attach(MIMEText(body_text, "plain"))
    message.attach(MIMEText(body_html, "html"))

    raw = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")

    async with httpx.AsyncClient() as client:
        response = await client.put(
            f"{GMAIL_API_BASE}/drafts/{draft_id}",
            json={"message": {"raw": raw}},
            headers=_build_auth_headers(access_token),
        )

    if response.status_code == 401:
        raise GmailServiceError(
            "Google authorization has expired. Please reconnect your Google account.",
            requires_reauth=True,
        )

    if response.status_code != 200:
        raise GmailServiceError(f"Failed to update draft: {response.text}")

    return response.json()


async def delete_draft(refresh_token: str, draft_id: str) -> None:
    """Delete a draft permanently."""
    access_token = await _refresh_access_token(refresh_token)

    async with httpx.AsyncClient() as client:
        response = await client.delete(
            f"{GMAIL_API_BASE}/drafts/{draft_id}",
            headers=_build_auth_headers(access_token),
        )

    if response.status_code == 401:
        raise GmailServiceError(
            "Google authorization has expired. Please reconnect your Google account.",
            requires_reauth=True,
        )

    if response.status_code not in (200, 204):
        raise GmailServiceError(f"Failed to delete draft: {response.text}")


async def send_draft(refresh_token: str, draft_id: str) -> dict:
    """Send an existing draft."""
    access_token = await _refresh_access_token(refresh_token)

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{GMAIL_API_BASE}/drafts/send",
            json={"id": draft_id},
            headers=_build_auth_headers(access_token),
        )

    if response.status_code == 401:
        raise GmailServiceError(
            "Google authorization has expired. Please reconnect your Google account.",
            requires_reauth=True,
        )

    if response.status_code != 200:
        raise GmailServiceError(f"Failed to send draft: {response.text}")

    return response.json()


# ---------------------------------------------------------------------------
# Connection check
# ---------------------------------------------------------------------------


async def check_gmail_connection(refresh_token: str) -> dict:
    """
    Verify Gmail API access by fetching the user's profile.
    Returns { "emailAddress": "...", "messagesTotal": N, ... }
    """
    access_token = await _refresh_access_token(refresh_token)

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{GMAIL_API_BASE}/profile",
            headers=_build_auth_headers(access_token),
        )

    if response.status_code == 401:
        raise GmailServiceError(
            "Google authorization has expired. Please reconnect your Google account.",
            requires_reauth=True,
        )

    if response.status_code != 200:
        raise GmailServiceError(f"Failed to verify Gmail connection: {response.text}")

    return response.json()
