from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class EmailBase(BaseModel):
    campaign_id: Optional[int] = None
    job_id: Optional[int] = None
    recipient_email: str
    subject: Optional[str] = None
    body: Optional[str] = None
    status: Optional[str] = "pending"

class EmailCreate(EmailBase):
    pass

class EmailUpdate(BaseModel):
    subject: Optional[str] = None
    body: Optional[str] = None
    status: Optional[str] = None

class EmailResponse(EmailBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)
