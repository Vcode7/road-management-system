import random
from database.connection import SessionLocal
import models
from models.report import Report, SeverityLevel, ReportStatus
from models.user import User   # 🔥 IMPORTANT FIX
db = SessionLocal()

# Possible values
severities = [
    SeverityLevel.low,
    SeverityLevel.medium,
    SeverityLevel.high,
    SeverityLevel.critical
]

statuses = [
    ReportStatus.submitted,
    ReportStatus.verified,
    ReportStatus.scheduled,
    ReportStatus.repairing,
    ReportStatus.completed
]

for report in db.query(Report).all():

    # 🔥 Random severity
    report.severity = random.choice(severities)

    # 🔥 Random traffic (1–5)
    report.traffic_density = round(random.uniform(1.0, 5.0), 2)

    # 🔥 Priority based on severity + traffic (realistic)
    base = {
        SeverityLevel.low: 2,
        SeverityLevel.medium: 5,
        SeverityLevel.high: 7,
        SeverityLevel.critical: 9
    }

    report.priority_score = round(
        base[report.severity] + (report.traffic_density / 5),
        2
    )

    # 🔥 Random status (but logical)
    if report.severity == SeverityLevel.critical:
        report.status = random.choice([
            ReportStatus.verified,
            ReportStatus.scheduled,
            ReportStatus.repairing
        ])
    else:
        report.status = random.choice(statuses)

db.commit()
db.close()

print("🔥 Random report updates applied successfully!")