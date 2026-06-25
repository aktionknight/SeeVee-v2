from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class LeadBase(BaseModel):
    company_name: str
    person_name: str
    person_role: str
    linkedin_url: str
    email: Optional[str] = None
    domain: Optional[str] = None
    region: Optional[str] = None
    source: Optional[str] = "apify_scrape"
    status: Optional[str] = "new"

class LeadCreate(LeadBase):
    pass

class LeadUpdateEmail(BaseModel):
    email: str

class LeadResponse(LeadBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True
        from_attributes = True
