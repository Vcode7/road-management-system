"""
Agent Orchestrator
Runs the full autonomous repair planning cycle.
"""
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from models.report import Report, ReportStatus
from models.agent_plan import AgentPlan, AgentPlanType, AgentPlanStatus
from models.repair_job import RepairJob
from agent.prioritizer import prioritize_reports
from agent.batch_planner import plan_repair_batches
from agent.contractor_selector import select_best_contractor
from agent.bid_optimizer import optimize_bids
from agent.quality_checker import check_pending_verifications

logger = logging.getLogger(__name__)


def run_agent_cycle(db: Session, authority_user_id: str = "system") -> dict:
    """
    Full autonomous agent cycle:
    1. Prioritize pending reports
    2. Create repair batches
    3. Select contractors for open jobs
    4. Optimize bids
    5. Verify completed repairs
    """
    logger.info("Agent cycle started")
    actions = []
    jobs_created = []
    reports_processed = []

    # Create plan record
    plan = AgentPlan(
        plan_type=AgentPlanType.full_cycle,
        status=AgentPlanStatus.executing,
        summary="Agent autonomous cycle started",
    )
    db.add(plan)
    db.commit()

    try:
        # Step 1: Prioritize
        pending_reports = db.query(Report).filter(
            Report.status == ReportStatus.submitted
        ).all()

        prioritized = prioritize_reports(pending_reports)
        actions.append(f"Prioritized {len(prioritized)} pending reports")
        reports_processed = [r.id for r in prioritized]

        # Step 2: Batch plan
        batches = plan_repair_batches(prioritized)
        actions.append(f"Created {len(batches)} repair batches from {len(prioritized)} reports")

        for batch in batches:
            if not batch:
                continue
            # Use centroid of batch as job location
            avg_lat = sum(r.latitude for r in batch) / len(batch)
            avg_lng = sum(r.longitude for r in batch) / len(batch)
            top_report = batch[0]

            from services.job_service import create_repair_job
            job = create_repair_job(
                db=db,
                title=f"Agent Repair: {top_report.damage_type} zone ({len(batch)} reports)",
                description=f"Automated repair job covering {len(batch)} damage report(s). Priority: {top_report.priority_score:.1f}",
                latitude=avg_lat,
                longitude=avg_lng,
                address=top_report.road_name or "Unknown road",
                estimated_cost=_estimate_cost(batch),
                estimated_area=sum(d.area_estimate or 100 for r in batch for d in r.damages),
                deadline=datetime.utcnow() + timedelta(days=_deadline_days(batch)),
                report_ids=[r.id for r in batch],
                created_by=authority_user_id,
                priority_score=max(r.priority_score for r in batch),
                created_by_agent=True,
            )
            jobs_created.append(job.id)
            actions.append(f"Created job {job.id} for {len(batch)} reports")

        # Step 3 & 4: Bid optimization for existing jobs in bidding stage
        optimized = optimize_bids(db)
        actions.extend(optimized["actions"])

        # Step 5: Quality verification
        verifications = check_pending_verifications(db)
        actions.extend(verifications["actions"])

        # Update plan
        plan.status = AgentPlanStatus.completed
        plan.actions_taken = actions
        plan.jobs_created = jobs_created
        plan.reports_processed = reports_processed
        plan.completed_at = datetime.utcnow()
        plan.summary = f"Cycle complete: {len(batches)} batches, {len(jobs_created)} jobs created"
        plan.details = {
            "batches": len(batches),
            "jobs_created": len(jobs_created),
            "reports_processed": len(reports_processed),
            "bids_optimized": optimized.get("count", 0),
            "verifications": verifications.get("count", 0),
        }
        db.commit()
        logger.info(f"Agent cycle complete: {plan.summary}")
        return {"plan_id": plan.id, "summary": plan.summary, "actions": actions}

    except Exception as e:
        logger.error(f"Agent cycle failed: {e}", exc_info=True)
        plan.status = AgentPlanStatus.failed
        plan.error_message = str(e)
        db.commit()
        return {"plan_id": plan.id, "error": str(e), "actions": actions}


def _estimate_cost(reports: list) -> float:
    """Rough cost estimate per damage count and severity."""
    cost = 0.0
    cost_map = {"low": 5000, "medium": 15000, "high": 40000, "critical": 100000}
    for r in reports:
        cost += cost_map.get(r.severity or "medium", 15000)
    return cost


def _deadline_days(reports: list) -> int:
    severity_days = {"critical": 2, "high": 5, "medium": 14, "low": 30}
    max_sev = max((r.severity or "medium") for r in reports)
    return severity_days.get(max_sev, 14)
