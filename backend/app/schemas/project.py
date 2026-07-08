from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any
from datetime import datetime

class ProjectBase(BaseModel):
    title: str
    description: Optional[str] = None
    technologies: Optional[List[str]] = []
    bullets: Optional[List[str]] = []
    metrics: Optional[List[Any]] = []
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    github_url: Optional[str] = None
    live_url: Optional[str] = None
    source_document_id: Optional[int] = None
    source_text: Optional[str] = None
    verification_status: Optional[str] = "extracted"
    is_visible: Optional[bool] = True

class ProjectCreate(ProjectBase):
    profile_id: int

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    technologies: Optional[List[str]] = None
    bullets: Optional[List[str]] = None
    metrics: Optional[List[Any]] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    github_url: Optional[str] = None
    live_url: Optional[str] = None
    source_document_id: Optional[int] = None
    source_text: Optional[str] = None
    verification_status: Optional[str] = None
    is_visible: Optional[bool] = None

class ProjectResponse(ProjectBase):
    id: int
    user_id: int
    profile_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
