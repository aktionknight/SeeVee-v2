from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any
from datetime import datetime

class GeneratedResumeBase(BaseModel):
    job_description_id: Optional[int] = None
    resume_json: Any
    selected_project_ids: Optional[List[int]] = []
    selected_skill_ids: Optional[List[int]] = []
    match_score: Optional[float] = None
    generation_model: Optional[str] = "gemini-2.5-flash"
    version: Optional[int] = 1
    template_name: Optional[str] = None

class GeneratedResumeCreate(GeneratedResumeBase):
    pass

class GeneratedResumeUpdate(BaseModel):
    job_description_id: Optional[int] = None
    resume_json: Optional[Any] = None
    selected_project_ids: Optional[List[int]] = None
    selected_skill_ids: Optional[List[int]] = None
    match_score: Optional[float] = None
    generation_model: Optional[str] = None
    version: Optional[int] = None
    template_name: Optional[str] = None
    pdf_storage_path: Optional[str] = None
    docx_storage_path: Optional[str] = None

class GeneratedResumeResponse(GeneratedResumeBase):
    id: int
    user_id: int
    pdf_storage_path: Optional[str] = None
    docx_storage_path: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
