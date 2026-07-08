from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class AchievementBase(BaseModel):
    title: str
    description: Optional[str] = None
    date: Optional[str] = None
    issuer: Optional[str] = None
    achievement_type: Optional[str] = None
    source_document_id: Optional[int] = None
    verification_status: Optional[str] = "extracted"

class AchievementCreate(AchievementBase):
    profile_id: int

class AchievementUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    issuer: Optional[str] = None
    achievement_type: Optional[str] = None
    source_document_id: Optional[int] = None
    verification_status: Optional[str] = None

class AchievementResponse(AchievementBase):
    id: int
    user_id: int
    profile_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
