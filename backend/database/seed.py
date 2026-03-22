"""
Demo seed data for Sadak Kadak (Contractor-focused)
==================================================
Creates:
- Users (citizen, authority, contractors)
- Multiple contractor profiles
- One repair job
- Multiple bids (for demo of contractor selection)
"""

import logging
from sqlalchemy.orm import Session
from database.connection import SessionLocal
from services.auth_service import create_user, get_user_by_email
from models.user import UserRole
from models.contractor import Contractor
from models.repair_job import RepairJob, JobStatus
from models.bid import Bid

logger = logging.getLogger(__name__)

# ─────────────────── Users ───────────────────
DEMO_USERS = [
    {"name": "Rahul Sharma", "email": "citizen@demo.com", "password": "demo1234", "role": UserRole.citizen},
    {"name": "Municipal Authority", "email": "authority@demo.com", "password": "demo1234", "role": UserRole.authority},
]

# ─────────────────── Contractors ───────────────────
CONTRACTORS_DATA = [
    {
        "name": "RoadFix Contractors Pvt Ltd",
        "email": "contractor@demo.com",
        "license": "DL-CON-2024-001",
        "rating": 4.6,
        "completed": 47,
        "total": 50,
        "quality": 88.5,
        "lat": 17.6600,
        "lng": 75.9100,
    },
    {
        "name": "Highway Experts Ltd",
        "email": "contractor2@demo.com",
        "license": "DL-CON-2024-002",
        "rating": 4.2,
        "completed": 32,
        "total": 40,
        "quality": 82.0,
        "lat": 17.6700,
        "lng": 75.9200,
    },
    {
        "name": "SmartRoad Infra",
        "email": "contractor3@demo.com",
        "license": "DL-CON-2024-003",
        "rating": 4.8,
        "completed": 60,
        "total": 65,
        "quality": 91.0,
        "lat": 17.6500,
        "lng": 75.8900,
    },
]


def seed_demo_data():
    db: Session = SessionLocal()

    try:
        # Prevent duplicate seeding
        if get_user_by_email(db, "authority@demo.com"):
            logger.info("Demo data already seeded.")
            return

        logger.info("Seeding demo data...")

        # ── Create Users ───────────────────────
        users = {}
        for u in DEMO_USERS:
            user = create_user(db, u["name"], u["email"], u["password"], u["role"])
            users[u["email"]] = user

        # ── Create Contractors ─────────────────
        contractor_objs = []

        for c in CONTRACTORS_DATA:
            user = create_user(
                db,
                c["name"],
                c["email"],
                "demo1234",
                UserRole.contractor,
            )

            contractor = Contractor(
                user_id=user.id,
                company_name=c["name"],
                license_number=c["license"],
                specialization=["pothole", "crack", "other corruption"],
                rating=c["rating"],
                completed_jobs=c["completed"],
                total_jobs=c["total"],
                completion_rate=c["completed"] / c["total"],
                average_quality_score=c["quality"],
                latitude=c["lat"],
                longitude=c["lng"],
                service_radius_km=100.0,
            )

            db.add(contractor)
            contractor_objs.append(contractor)

        db.flush()

        # ── Create Repair Job ──────────────────
        authority = users["authority@demo.com"]

        job = RepairJob(
            title="Emergency Road Repair - Solapur Central",
            description="Urgent repair work for multiple road damages",
            latitude=17.6599,
            longitude=75.9064,
            address="Solapur City Center",
            estimated_cost=50000.0,
            estimated_area=15.0,
            status=JobStatus.bidding,
            priority_score=9.2,
            created_by=authority.id,
        )

        db.add(job)
        db.flush()

        # ── Create Multiple Bids ───────────────
        bids_data = [
            {"price": 42000, "days": 2},
            {"price": 39000, "days": 3},
            {"price": 45000, "days": 1},
        ]

        for contractor, bid_data in zip(contractor_objs, bids_data):
            bid = Bid(
                job_id=job.id,
                contractor_id=contractor.id,
                price=bid_data["price"],
                repair_time_days=bid_data["days"],
                materials=["bitumen", "aggregate"],
                notes="Auto-generated demo bid",
            )
            db.add(bid)

        db.commit()

        logger.info("✅ Demo data seeded successfully!")
        logger.info("Demo Accounts:")
        logger.info("  Citizen:    citizen@demo.com / demo1234")
        logger.info("  Authority:  authority@demo.com / demo1234")
        logger.info("  Contractors: contractor@demo.com / demo1234")

    except Exception as e:
        db.rollback()
        logger.error(f"Seed failed: {e}", exc_info=True)

    finally:
        db.close()