"""
schemas.py
----------
Pydantic models define the shape of data going IN (request bodies) and
OUT (responses) of the API. They are deliberately separate from
models.py (the DB tables) -- this separation is a common FastAPI
pattern so we never accidentally expose internal DB fields to the
client, and so we can validate input before it touches the database.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# ---------- Meeting ----------

class InstantMeetingCreate(BaseModel):
    host_name: str = Field(default="Dhruv Sharma")
    title: str = Field(default="Instant Meeting")


class ScheduleMeetingCreate(BaseModel):
    title: str
    description: Optional[str] = None
    host_name: str = Field(default="Dhruv Sharma")
    scheduled_time: datetime
    duration_minutes: int = Field(default=30, ge=5, le=480)


class MeetingOut(BaseModel):
    id: int
    meeting_code: str
    title: str
    description: Optional[str] = None
    host_name: str
    meeting_type: str
    status: str
    scheduled_time: Optional[datetime] = None
    duration_minutes: int
    created_at: datetime
    invite_link: str

    class Config:
        from_attributes = True  # lets Pydantic read straight from the ORM object


# ---------- Participant ----------

class JoinMeetingRequest(BaseModel):
    display_name: str = Field(min_length=1, max_length=100)


class ParticipantOut(BaseModel):
    id: int
    meeting_id: int
    display_name: str
    is_host: bool
    is_muted: bool
    is_video_on: bool
    is_active: bool

    class Config:
        from_attributes = True


class JoinMeetingResponse(BaseModel):
    participant: ParticipantOut
    meeting: MeetingOut
