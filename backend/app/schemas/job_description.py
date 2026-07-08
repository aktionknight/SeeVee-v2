from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any
from datetime import datetime

class JobDescriptionBase(BaseModel):
    raw_text: str
    role_title: Optional[str] = None
    company_name: Optional[str] = None
    seniority: Optional[str] = None

class JobDescriptionCreate(JobDescriptionBase):
    pass

class JobDescriptionUpdate(BaseModel):
    raw_text: Optional[str] = None
    role_title: Optional[str] = None
    company_name: Optional[str] = None
    seniority: Optional[str] = None
    required_skills: Optional[List[str]] = None
    preferred_skills: Optional[List[str]] = None
    responsibilities: Optional[List[str]] = None
    keywords: Optional[List[str]] = None
    analysis_json: Optional[Any] = None

class JobDescriptionResponse(JobDescriptionBase):
    id: int
    user_id: int
    required_skills: List[str] = []
    preferred_skills: List[str] = []
    responsibilities: List[str] = []
    keywords: List[str] = []
    analysis_json: Optional[Any] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
