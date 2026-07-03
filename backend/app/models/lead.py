from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func, Boolean
from app.core.database import Base

class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    company_name = Column(String, nullable=False)
    person_name = Column(String, nullable=False)
    person_role = Column(String, nullable=False)
    linkedin_url = Column(String, nullable=False)
    email = Column(String, nullable=True) # Custom email field
    domain = Column(String, nullable=True)
    region = Column(String, nullable=True)
    source = Column(String, default="apify_scrape")
    status = Column(String, default="new")
    is_qualified = Column(Boolean, default=True)
    disqualification_reason = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
