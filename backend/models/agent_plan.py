import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, JSON, Enum as SAEnum, Text, Float
from database.connection import Base
import enum


class AgentPlanType(str, enum.Enum):
    prioritization = "prioritization"
    batch_planning = "batch_planning"
    contractor_selection = "contractor_selection"
    bid_optimization = "bid_optimization"
    quality_verification = "quality_verification"
    full_cycle = "full_cycle"


class AgentPlanStatus(str, enum.Enum):
    pending = "pending"
    executing = "executing"
    completed = "completed"
    failed = "failed"


class AgentPlan(Base):
    __tablename__ = "agent_plans"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    plan_type = Column(SAEnum(AgentPlanType), nullable=False)
    status = Column(SAEnum(AgentPlanStatus), default=AgentPlanStatus.pending)
    details = Column(JSON, default=dict)     # Full plan JSON
    summary = Column(Text, nullable=True)
    actions_taken = Column(JSON, default=list)
    reports_processed = Column(JSON, default=list)   # IDs
    jobs_created = Column(JSON, default=list)         # IDs
    score = Column(Float, nullable=True)             # Overall plan quality
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
