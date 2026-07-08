from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class UploadedDocumentBase(BaseModel):
    file_name: str
    storage_path: str
    mime_type: Optional[str] = "application/pdf"
    file_size: Optional[int] = None
    page_count: Optional[int] = None

class UploadedDocumentCreate(UploadedDocumentBase):
    pass

class UploadedDocumentUpdate(BaseModel):
    file_name: Optional[str] = None
    storage_path: Optional[str] = None
    mime_type: Optional[str] = None
    file_size: Optional[int] = None
    page_count: Optional[int] = None
    processing_status: Optional[str] = None
    text_extraction_status: Optional[str] = None
    extracted_text: Optional[str] = None
    error_message: Optional[str] = None

class UploadedDocumentResponse(UploadedDocumentBase):
    id: int
    user_id: int
    processing_status: str = "pending"
    text_extraction_status: str = "pending"
    extracted_text: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
