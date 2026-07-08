from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func, Text, JSON
from app.core.database import Base

class JobDescription(Base):
    __tablename__ = "job_descriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    raw_text = Column(Text, nullable=False)
    role_title = Column(String, nullable=True)
    company_name = Column(String, nullable=True)
    seniority = Column(String, nullable=True)
    required_skills = Column(JSON, default=list)
    preferred_skills = Column(JSON, default=list)
    responsibilities = Column(JSON, default=list)
    keywords = Column(JSON, default=list)
    analysis_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
