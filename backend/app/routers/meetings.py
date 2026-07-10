"""
routers/meetings.py
--------------------
All the REST (request/response) endpoints for meetings + participants.
WebSocket signaling lives separately in routers/signaling.py.

Endpoint summary (also documented in README):
  POST /api/meetings/instant           -> create + start an instant meeting
  POST /api/meetings/schedule          -> create a future scheduled meeting
  GET  /api/meetings/upcoming          -> list scheduled meetings (dashboard)
  GET  /api/meetings/recent            -> list ended/started meetings (dashboard)
  GET  /api/meetings/{code}            -> look up one meeting (used by Join flow)
  POST /api/meetings/{code}/join       -> add a participant, mark meeting active
  POST /api/meetings/{code}/leave/{participant_id}
  GET  /api/meetings/{code}/participants
  POST /api/meetings/{code}/mute-all   -> host control
  POST /api/meetings/{code}/remove/{participant_id} -> host control
"""
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from .. import models, schemas
from ..database import get_db
from ..ws_manager import manager

router = APIRouter(prefix="/api/meetings", tags=["meetings"])


def _get_meeting_or_404(db: Session, code: str) -> models.Meeting:
    meeting = db.query(models.Meeting).filter(models.Meeting.meeting_code == code).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found. Check the Meeting ID and try again.")
    return meeting


@router.post("/instant", response_model=schemas.MeetingOut)
def create_instant_meeting(payload: schemas.InstantMeetingCreate, db: Session = Depends(get_db)):
    meeting = models.Meeting(
        title=payload.title,
        host_name=payload.host_name,
        meeting_type=models.MeetingType.INSTANT.value,
        status=models.MeetingStatus.ACTIVE.value,
        started_at=datetime.utcnow(),
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting


@router.post("/schedule", response_model=schemas.MeetingOut)
def schedule_meeting(payload: schemas.ScheduleMeetingCreate, db: Session = Depends(get_db)):
    meeting = models.Meeting(
        title=payload.title,
        description=payload.description,
        host_name=payload.host_name,
        meeting_type=models.MeetingType.SCHEDULED.value,
        status=models.MeetingStatus.SCHEDULED.value,
        scheduled_time=payload.scheduled_time,
        duration_minutes=payload.duration_minutes,
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting


@router.get("/upcoming", response_model=List[schemas.MeetingOut])
def list_upcoming(db: Session = Depends(get_db)):
    """Scheduled meetings that haven't started yet, soonest first."""
    return (
        db.query(models.Meeting)
        .filter(models.Meeting.status == models.MeetingStatus.SCHEDULED.value)
        .order_by(models.Meeting.scheduled_time.asc())
        .all()
    )


@router.get("/recent", response_model=List[schemas.MeetingOut])
def list_recent(db: Session = Depends(get_db)):
    """Meetings that have been started or ended, most recent first."""
    return (
        db.query(models.Meeting)
        .filter(models.Meeting.status != models.MeetingStatus.SCHEDULED.value)
        .order_by(desc(models.Meeting.created_at))
        .limit(20)
        .all()
    )


@router.get("/{code}", response_model=schemas.MeetingOut)
def get_meeting(code: str, db: Session = Depends(get_db)):
    return _get_meeting_or_404(db, code)


@router.post("/{code}/join", response_model=schemas.JoinMeetingResponse)
def join_meeting(code: str, payload: schemas.JoinMeetingRequest, db: Session = Depends(get_db)):
    meeting = _get_meeting_or_404(db, code)

    if meeting.status == models.MeetingStatus.ENDED.value:
        raise HTTPException(status_code=410, detail="This meeting has already ended.")

    # First person to join a meeting that has no active participants yet
    # becomes the host for this session (mirrors "meeting starts when host joins").
    active_count = (
        db.query(models.Participant)
        .filter(models.Participant.meeting_id == meeting.id, models.Participant.is_active == True)  # noqa: E712
        .count()
    )
    is_host = active_count == 0

    participant = models.Participant(
        meeting_id=meeting.id,
        display_name=payload.display_name,
        is_host=is_host,
    )
    db.add(participant)

    if meeting.status == models.MeetingStatus.SCHEDULED.value:
        meeting.status = models.MeetingStatus.ACTIVE.value
        meeting.started_at = datetime.utcnow()

    db.commit()
    db.refresh(participant)
    db.refresh(meeting)
    return schemas.JoinMeetingResponse(participant=participant, meeting=meeting)


@router.get("/{code}/participants", response_model=List[schemas.ParticipantOut])
def list_participants(code: str, db: Session = Depends(get_db)):
    meeting = _get_meeting_or_404(db, code)
    return (
        db.query(models.Participant)
        .filter(models.Participant.meeting_id == meeting.id, models.Participant.is_active == True)  # noqa: E712
        .all()
    )


@router.post("/{code}/leave/{participant_id}")
async def leave_meeting(code: str, participant_id: int, db: Session = Depends(get_db)):
    meeting = _get_meeting_or_404(db, code)
    participant = db.query(models.Participant).filter(
        models.Participant.id == participant_id, models.Participant.meeting_id == meeting.id
    ).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found in this meeting.")

    participant.is_active = False
    participant.left_at = datetime.utcnow()

    # If no one is left active, mark the meeting ended.
    remaining = (
        db.query(models.Participant)
        .filter(models.Participant.meeting_id == meeting.id, models.Participant.is_active == True)  # noqa: E712
        .count()
    )
    if remaining == 0:
        meeting.status = models.MeetingStatus.ENDED.value
        meeting.ended_at = datetime.utcnow()

    db.commit()

    manager.disconnect(code, participant_id)
    await manager.broadcast(code, {"type": "participant-left", "participant_id": participant_id})
    return {"ok": True}


@router.post("/{code}/mute-all")
async def mute_all(code: str, db: Session = Depends(get_db)):
    """Host control: force is_muted = True on every active participant except the host."""
    meeting = _get_meeting_or_404(db, code)
    participants = db.query(models.Participant).filter(
        models.Participant.meeting_id == meeting.id,
        models.Participant.is_active == True,  # noqa: E712
        models.Participant.is_host == False,   # noqa: E712
    ).all()
    for p in participants:
        p.is_muted = True
    db.commit()

    await manager.broadcast(code, {"type": "force-mute-all"})
    return {"ok": True, "muted_count": len(participants)}


@router.post("/{code}/remove/{participant_id}")
async def remove_participant(code: str, participant_id: int, db: Session = Depends(get_db)):
    """Host control: kick a participant out of the meeting."""
    meeting = _get_meeting_or_404(db, code)
    participant = db.query(models.Participant).filter(
        models.Participant.id == participant_id, models.Participant.meeting_id == meeting.id
    ).first()
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found.")

    participant.is_active = False
    participant.left_at = datetime.utcnow()
    db.commit()

    await manager.send_to(code, participant_id, {"type": "removed-by-host"})
    manager.disconnect(code, participant_id)
    await manager.broadcast(code, {"type": "participant-left", "participant_id": participant_id})
    return {"ok": True}
