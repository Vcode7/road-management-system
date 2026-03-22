"""
Quality Checker
Auto-verifies repairs by checking completed jobs that need inspection.
"""
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from models.repair_job import RepairJob, JobStatus
from models.repair_progress import RepairProgress, RepairStage
from ai.repair_verifier import verify_repair

logger = logging.getLogger(__name__)


def check_pending_verifications(db: Session) -> dict:
    """
    Find jobs in inspection_pending stage, run repair verification,
    update job status accordingly.
    """
    actions = []
    count = 0

    jobs = db.query(RepairJob).filter(RepairJob.status == JobStatus.in_progress).all()

    for job in jobs:
        # Find inspection_pending progress
        pending_inspection = next(
            (p for p in job.progress_updates if p.stage == RepairStage.inspection_pending),
            None
        )
        if not pending_inspection or not pending_inspection.images:
            continue

        # Find before and after images
        images = pending_inspection.images
        if len(images) < 2:
            continue

        before_img = images[0]
        after_img = images[-1]

        result = verify_repair(before_img, after_img)
        pending_inspection.quality_score = result["repair_quality_score"]

        if result["passed"]:
            pending_inspection.stage = RepairStage.verified
            pending_inspection.notes = (
                f"AI auto-verified: {result['verdict']} "
                f"(quality={result['repair_quality_score']})"
            )
            job.status = JobStatus.verified
            actions.append(f"Job {job.id} auto-verified (score={result['repair_quality_score']})")
        else:
            pending_inspection.stage = RepairStage.rejected
            pending_inspection.notes = (
                f"AI rejected repair: {result['verdict']} "
                f"(score={result['repair_quality_score']}). Reassignment required."
            )
            job.status = JobStatus.assigned  # re-open for contractor
            actions.append(f"Job {job.id} repair REJECTED (score={result['repair_quality_score']})")

        db.add(pending_inspection)
        count += 1

    db.commit()
    return {"actions": actions, "count": count}
