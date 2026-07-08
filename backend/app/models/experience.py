from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func, Text, Boolean, JSON
from app.core.database import Base

class Experience(Base):
    __tablename__ = "experiences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    profile_id = Column(Integer, ForeignKey("career_profiles.id"), nullable=False)
    company = Column(String, nullable=False)
    title = Column(String, nullable=False)
    location = Column(String, nullable=True)
    start_date = Column(String, nullable=True)
    end_date = Column(String, nullable=True)
    is_current = Column(Boolean, default=False)
    description = Column(Text, nullable=True)
    bullets = Column(JSON, default=list)
    source_document_id = Column(Integer, ForeignKey("uploaded_documents.id"), nullable=True)
    source_text = Column(Text, nullable=True)
    verification_status = Column(String, default="extracted")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
