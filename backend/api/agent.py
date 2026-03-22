"""
Agent API: /api/agent
"""
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session

from database.connection import get_db
from models.user import User, UserRole
from models.agent_plan import AgentPlan
from agent.orchestrator import run_agent_cycle
from api.auth import get_current_user, require_role

router = APIRouter(prefix="/agent", tags=["Agent System"])


@router.post("/run")
def trigger_agent_cycle(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_role(UserRole.authority, UserRole.admin)),
    db: Session = Depends(get_db),
):
    """Trigger a full autonomous agent cycle (runs synchronously for prototype)."""
    result = run_agent_cycle(db, authority_user_id=current_user.id)
    return {"message": "Agent cycle complete", **result}


@router.get("/plans")
def list_agent_plans(
    limit: int = 20,
    current_user: User = Depends(require_role(UserRole.authority, UserRole.admin)),
    db: Session = Depends(get_db),
):
    plans = db.query(AgentPlan).order_by(AgentPlan.created_at.desc()).limit(limit).all()
    return [_plan_dict(p) for p in plans]


@router.get("/plans/{plan_id}")
def get_plan(
    plan_id: str,
    current_user: User = Depends(require_role(UserRole.authority, UserRole.admin)),
    db: Session = Depends(get_db),
):
    plan = db.query(AgentPlan).filter(AgentPlan.id == plan_id).first()
    if not plan:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Plan not found")
    return _plan_dict(plan)


def _plan_dict(p: AgentPlan) -> dict:
    return {
        "id": p.id,
        "plan_type": p.plan_type,
        "status": p.status,
        "summary": p.summary,
        "actions_taken": p.actions_taken,
        "reports_processed": p.reports_processed,
        "jobs_created": p.jobs_created,
        "details": p.details,
        "score": p.score,
        "error_message": p.error_message,
        "created_at": p.created_at,
        "completed_at": p.completed_at,
    }
