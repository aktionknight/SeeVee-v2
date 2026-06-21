from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class JobBase(BaseModel):
    user_id: int
    title: str
    company: str
    description: Optional[str] = None
    url: Optional[str] = None

class JobCreate(JobBase):
    pass

class JobUpdate(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None

class JobResponse(JobBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)
