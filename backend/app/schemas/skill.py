from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class SkillBase(BaseModel):
    name: str
    category: Optional[str] = None
    proficiency_level: Optional[str] = None
    source_document_id: Optional[int] = None
    verification_status: Optional[str] = "extracted"

class SkillCreate(SkillBase):
    profile_id: int

class SkillUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    proficiency_level: Optional[str] = None
    source_document_id: Optional[int] = None
    verification_status: Optional[str] = None

class SkillResponse(SkillBase):
    id: int
    user_id: int
    profile_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
