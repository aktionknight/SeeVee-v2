from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func, Text, Boolean, JSON
from app.core.database import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    profile_id = Column(Integer, ForeignKey("career_profiles.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    technologies = Column(JSON, default=list)
    bullets = Column(JSON, default=list)
    metrics = Column(JSON, default=list)
    start_date = Column(String, nullable=True)
    end_date = Column(String, nullable=True)
    github_url = Column(String, nullable=True)
    live_url = Column(String, nullable=True)
    source_document_id = Column(Integer, ForeignKey("uploaded_documents.id"), nullable=True)
    source_text = Column(Text, nullable=True)
    verification_status = Column(String, default="extracted")
    is_visible = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
