from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func
from app.core.database import Base

class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    profile_id = Column(Integer, ForeignKey("career_profiles.id"), nullable=False)
    name = Column(String, nullable=False)
    category = Column(String, nullable=True)
    proficiency_level = Column(String, nullable=True)
    source_document_id = Column(Integer, ForeignKey("uploaded_documents.id"), nullable=True)
    verification_status = Column(String, default="extracted")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
