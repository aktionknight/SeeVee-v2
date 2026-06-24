from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, func
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=True)  # Deprecated — kept for migration compatibility
    is_active = Column(Boolean, default=True)
    auth_provider = Column(String, default="google")  # Always "google" now
    google_id = Column(String, unique=True, nullable=True, index=True)
    avatar_url = Column(String, nullable=True)

    # Encrypted Google OAuth refresh token — enables Gmail API access
    # Encrypted with Fernet (AES) using ENCRYPTION_KEY from .env
    encrypted_google_refresh_token = Column(Text, nullable=True)

    # Whether the user has granted Gmail scopes (read, send, compose)
    gmail_connected = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
