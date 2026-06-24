from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    is_active: bool
    auth_provider: str = "google"
    avatar_url: Optional[str] = None
    gmail_connected: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    name: Optional[str] = None
