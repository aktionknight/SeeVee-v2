from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class ExperienceBase(BaseModel):
    company: str
    title: str
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_current: Optional[bool] = False
    description: Optional[str] = None
    bullets: Optional[List[str]] = []
    source_document_id: Optional[int] = None
    source_text: Optional[str] = None
    verification_status: Optional[str] = "extracted"

class ExperienceCreate(ExperienceBase):
    profile_id: int

class ExperienceUpdate(BaseModel):
    company: Optional[str] = None
    title: Optional[str] = None
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_current: Optional[bool] = None
    description: Optional[str] = None
    bullets: Optional[List[str]] = None
    source_document_id: Optional[int] = None
    source_text: Optional[str] = None
    verification_status: Optional[str] = None

class ExperienceResponse(ExperienceBase):
    id: int
    user_id: int
    profile_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
