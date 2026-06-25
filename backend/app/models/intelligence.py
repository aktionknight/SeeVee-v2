from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func, JSON, Float
from app.core.database import Base

class ResearchProfile(Base):
    __tablename__ = "research_profiles"
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    normalized_profile = Column(JSON, nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class LeadInsight(Base):
    __tablename__ = "lead_insights"
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    hooks = Column(JSON, nullable=True)
    signals = Column(JSON, nullable=True)
    score = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class GeneratedContent(Base):
    __tablename__ = "generated_content"
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    content_type = Column(String, nullable=False)
    content = Column(String, nullable=False)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
