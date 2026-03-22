import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Float, JSON, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship
from database.connection import Base


class Contractor(Base):
    __tablename__ = "contractors"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False)
    company_name = Column(String(255), nullable=False)
    license_number = Column(String(100), nullable=True)
    specialization = Column(JSON, default=list)   # ["pothole", "crack", "road_collapse"]
    rating = Column(Float, default=5.0)           # 0–5 scale
    completed_jobs = Column(Integer, default=0)
    total_jobs = Column(Integer, default=0)
    completion_rate = Column(Float, default=1.0)  # 0.0–1.0
    average_quality_score = Column(Float, default=85.0)
    latitude = Column(Float, nullable=True)       # Base location
    longitude = Column(Float, nullable=True)
    service_radius_km = Column(Float, default=50.0)
    is_available = Column(String(5), default="true")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="contractor_profile")
    bids = relationship("Bid", back_populates="contractor")
