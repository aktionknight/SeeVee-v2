from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime

class IntegrationBase(BaseModel):
    user_id: int
    platform: str
    credentials: Dict[str, Any]

class IntegrationCreate(IntegrationBase):
    pass

class IntegrationUpdate(IntegrationBase):
    pass

class IntegrationResponse(IntegrationBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)
