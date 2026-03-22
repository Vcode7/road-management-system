import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Float, JSON, Enum as SAEnum, ForeignKey, Text
from sqlalchemy.orm import relationship
from database.connection import Base
import enum


class BidStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"
    withdrawn = "withdrawn"


class Bid(Base):
    __tablename__ = "bids"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String, ForeignKey("repair_jobs.id"), nullable=False)
    contractor_id = Column(String, ForeignKey("contractors.id"), nullable=False)
    price = Column(Float, nullable=False)           # INR
    repair_time_days = Column(Float, nullable=False)
    materials = Column(JSON, default=list)           # ["asphalt", "bitumen", ...]
    notes = Column(Text, nullable=True)
    status = Column(SAEnum(BidStatus), default=BidStatus.pending)
    ai_score = Column(Float, nullable=True)          # Agent bid quality score
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    job = relationship("RepairJob", back_populates="bids")
    contractor = relationship("Contractor", back_populates="bids")
