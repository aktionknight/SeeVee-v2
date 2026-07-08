from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class EducationBase(BaseModel):
    institution: str
    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    gpa: Optional[str] = None
    description: Optional[str] = None
    source_document_id: Optional[int] = None
    verification_status: Optional[str] = "extracted"

class EducationCreate(EducationBase):
    profile_id: int

class EducationUpdate(BaseModel):
    institution: Optional[str] = None
    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    gpa: Optional[str] = None
    description: Optional[str] = None
    source_document_id: Optional[int] = None
    verification_status: Optional[str] = None

class EducationResponse(EducationBase):
    id: int
    user_id: int
    profile_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
