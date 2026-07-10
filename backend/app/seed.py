"""
seed.py
-------
Populates the database with sample data so the dashboard isn't empty
on first run, per the assignment's "Seed your database" requirement.

Run with:  python -m app.seed   (from inside backend/)
"""
from datetime import datetime, timedelta

from .database import Base, engine, SessionLocal
from . import models


def run():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    if db.query(models.Meeting).count() > 0:
        print("Database already has data. Skipping seed.")
        db.close()
        return

    now = datetime.utcnow()

    # Two upcoming (scheduled) meetings
    db.add(models.Meeting(
        title="Placement Prep Sync",
        description="Mock interview + resume review",
        host_name="Dhruv Sharma",
        meeting_type=models.MeetingType.SCHEDULED.value,
        status=models.MeetingStatus.SCHEDULED.value,
        scheduled_time=now + timedelta(hours=3),
        duration_minutes=45,
    ))
    db.add(models.Meeting(
        title="Product Teardown Review",
        description="Walkthrough of Meesho PRISM teardown deck",
        host_name="Dhruv Sharma",
        meeting_type=models.MeetingType.SCHEDULED.value,
        status=models.MeetingStatus.SCHEDULED.value,
        scheduled_time=now + timedelta(days=1, hours=2),
        duration_minutes=30,
    ))

    # Two recent (ended) meetings, for the "Recent Meetings" section
    ended1 = models.Meeting(
        title="Team Standup",
        host_name="Dhruv Sharma",
        meeting_type=models.MeetingType.INSTANT.value,
        status=models.MeetingStatus.ENDED.value,
        created_at=now - timedelta(days=1),
        started_at=now - timedelta(days=1),
        ended_at=now - timedelta(days=1) + timedelta(minutes=20),
    )
    ended2 = models.Meeting(
        title="Hackathon Sync - CampusFlow",
        host_name="Dhruv Sharma",
        meeting_type=models.MeetingType.INSTANT.value,
        status=models.MeetingStatus.ENDED.value,
        created_at=now - timedelta(days=2),
        started_at=now - timedelta(days=2),
        ended_at=now - timedelta(days=2) + timedelta(minutes=40),
    )
    db.add(ended1)
    db.add(ended2)

    db.commit()
    print("Seed data inserted successfully.")
    db.close()


if __name__ == "__main__":
    run()
