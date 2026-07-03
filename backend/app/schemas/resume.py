from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class ResumeBase(BaseModel):
    name: str
    content: str
    file_url: Optional[str] = None

class ResumeCreate(ResumeBase):
    pass

class ResumeUpdate(BaseModel):
    name: Optional[str] = None
    content: Optional[str] = None
    file_url: Optional[str] = None

class ResumeResponse(ResumeBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)
