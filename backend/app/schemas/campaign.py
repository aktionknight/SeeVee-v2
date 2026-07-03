from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class CampaignBase(BaseModel):
    name: str
    status: Optional[str] = "draft"

class CampaignCreate(CampaignBase):
    pass

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None

class CampaignResponse(CampaignBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)
