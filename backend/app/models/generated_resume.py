from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func, JSON, Float
from app.core.database import Base

class GeneratedResume(Base):
    __tablename__ = "generated_resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    job_description_id = Column(Integer, ForeignKey("job_descriptions.id"), nullable=True)
    resume_json = Column(JSON, nullable=False)
    selected_project_ids = Column(JSON, default=list)
    selected_skill_ids = Column(JSON, default=list)
    match_score = Column(Float, nullable=True)
    generation_model = Column(String, default="gemini-2.5-flash")
    version = Column(Integer, default=1)
    template_name = Column(String, nullable=True)
    pdf_storage_path = Column(String, nullable=True)
    docx_storage_path = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
