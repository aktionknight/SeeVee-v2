from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func, Text
from app.core.database import Base

class UploadedDocument(Base):
    __tablename__ = "uploaded_documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    file_name = Column(String, nullable=False)
    storage_path = Column(String, nullable=False)
    mime_type = Column(String, default="application/pdf")
    file_size = Column(Integer, nullable=True)
    page_count = Column(Integer, nullable=True)
    processing_status = Column(String, default="pending")
    text_extraction_status = Column(String, default="pending")
    extracted_text = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
