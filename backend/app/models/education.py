from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func, Text
from app.core.database import Base

class Education(Base):
    __tablename__ = "educations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    profile_id = Column(Integer, ForeignKey("career_profiles.id"), nullable=False)
    institution = Column(String, nullable=False)
    degree = Column(String, nullable=True)
    field_of_study = Column(String, nullable=True)
    start_date = Column(String, nullable=True)
    end_date = Column(String, nullable=True)
    gpa = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    source_document_id = Column(Integer, ForeignKey("uploaded_documents.id"), nullable=True)
    verification_status = Column(String, default="extracted")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
