from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class IntegrationBase(BaseModel):
    platform: str

class IntegrationCreate(IntegrationBase):
    api_key: str

class IntegrationUpdate(IntegrationBase):
    api_key: Optional[str] = None
    is_active: Optional[bool] = None

class IntegrationResponse(IntegrationBase):
    id: int
    user_id: int
    masked_key: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)

class IntegrationStatusResponse(BaseModel):
    platform: str
    is_active: bool
    masked_key: str
