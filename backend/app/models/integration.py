from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func, JSON
from app.core.database import Base

class Integration(Base):
    __tablename__ = "integrations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    platform = Column(String, nullable=False) # e.g., 'linkedin', 'gmail'
    credentials = Column(JSON, nullable=False) # Access tokens, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
