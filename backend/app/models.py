"""
models.py
---------
Defines the database schema using SQLAlchemy ORM classes.

SCHEMA DESIGN (explain this in your evaluation interview):

Meeting (1) ----< (many) Participant

- One Meeting can have many Participants (people who joined it).
- Each Participant row belongs to exactly one Meeting (a foreign key,
  meeting_id, points back to meetings.id).
- This is a classic one-to-many relationship. We keep Participant as its
  own table (instead of cramming a participant list into a JSON column
  on Meeting) because:
    1. It's normalized -- no duplicated/awkward nested data.
    2. We can query it directly (e.g. "how many people are currently in
       meeting X" is just `SELECT COUNT(*) FROM participants WHERE
       meeting_id = X AND is_active = 1`).
    3. Host controls (mute-all, remove participant) become simple
       UPDATE/DELETE statements on this table instead of JSON surgery.

MeetingType and MeetingStatus are stored as plain strings (not native
SQLite ENUM, since SQLite doesn't really have one) but constrained via
Python Enums at the application layer for safety.
"""
import enum
import secrets
import string
from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey, Text
)
from sqlalchemy.orm import relationship

from .database import Base


class MeetingType(str, enum.Enum):
    INSTANT = "instant"
    SCHEDULED = "scheduled"


class MeetingStatus(str, enum.Enum):
    SCHEDULED = "scheduled"   # created, hasn't started yet
    ACTIVE = "active"         # currently in progress (someone joined)
    ENDED = "ended"           # host ended it / everyone left


def generate_meeting_code() -> str:
    """
    Generates a Zoom-style numeric meeting ID, grouped as ### #### ####
    e.g. '842 1937 5610'. We store it WITHOUT spaces in the DB
    (easier to match on join) and format it for display on the frontend.
    """
    digits = "".join(secrets.choice(string.digits) for _ in range(10))
    return digits


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    meeting_code = Column(String(10), unique=True, index=True, nullable=False,
                           default=generate_meeting_code)
    title = Column(String(255), nullable=False, default="New Meeting")
    description = Column(Text, nullable=True)
    host_name = Column(String(100), nullable=False, default="Dhruv Sharma")

    meeting_type = Column(String(20), nullable=False, default=MeetingType.INSTANT.value)
    status = Column(String(20), nullable=False, default=MeetingStatus.SCHEDULED.value)

    scheduled_time = Column(DateTime, nullable=True)   # only for scheduled meetings
    duration_minutes = Column(Integer, nullable=False, default=30)

    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)

    # One-to-many: a meeting has many participants.
    # cascade="all, delete-orphan" -> if a Meeting row is deleted, its
    # Participant rows go with it (no orphaned rows left behind).
    participants = relationship(
        "Participant", back_populates="meeting", cascade="all, delete-orphan"
    )

    @property
    def invite_link(self) -> str:
        # In a real deploy this would use the actual frontend domain;
        # for local dev we default to localhost:3000.
        import os
        base = os.getenv("FRONTEND_URL", "http://localhost:3000")
        return f"{base}/meeting/{self.meeting_code}"


class Participant(Base):
    __tablename__ = "participants"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False)

    display_name = Column(String(100), nullable=False)
    is_host = Column(Boolean, default=False)
    is_muted = Column(Boolean, default=False)
    is_video_on = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)   # False once they leave

    joined_at = Column(DateTime, default=datetime.utcnow)
    left_at = Column(DateTime, nullable=True)

    meeting = relationship("Meeting", back_populates="participants")
