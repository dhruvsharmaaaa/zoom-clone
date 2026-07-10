"""
routers/signaling.py
---------------------
The single WebSocket endpoint every participant connects to when they
enter a meeting room: ws://<host>/ws/{meeting_code}/{participant_id}

Message protocol (all JSON):

  Client -> Server:
    {"type": "offer",     "target": <participant_id>, "sdp": {...}}
    {"type": "answer",    "target": <participant_id>, "sdp": {...}}
    {"type": "ice-candidate", "target": <participant_id>, "candidate": {...}}
    {"type": "toggle-mute",  "is_muted": bool}
    {"type": "toggle-video", "is_video_on": bool}

  Server -> Client:
    {"type": "participant-joined", "participant_id", "display_name", "is_host"}
    {"type": "participant-left",   "participant_id"}
    {"type": "offer" | "answer" | "ice-candidate", "sender": <id>, ...}  (relayed)
    {"type": "peer-muted", "participant_id", "is_muted"}
    {"type": "peer-video", "participant_id", "is_video_on"}
    {"type": "force-mute-all"}
    {"type": "removed-by-host"}

Why relay through the server instead of peers finding each other
directly? Browsers have no way to know each other's IP/port ahead of
time (that's exactly what WebRTC's offer/answer/ICE-candidate exchange
solves) so *some* existing channel is needed to swap that information
before the peer-to-peer video connection can be established. Our
WebSocket is that channel. Once negotiation finishes, actual video/
audio flows directly between browsers, not through this server.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from ..database import SessionLocal
from .. import models
from ..ws_manager import manager

router = APIRouter()


@router.websocket("/ws/{meeting_code}/{participant_id}")
async def meeting_socket(websocket: WebSocket, meeting_code: str, participant_id: int):
    db: Session = SessionLocal()
    participant = db.query(models.Participant).filter(models.Participant.id == participant_id).first()
    if not participant:
        await websocket.close(code=4404)
        db.close()
        return

    await manager.connect(meeting_code, participant_id, websocket)

    # Tell everyone already in the room that a new peer arrived, so their
    # browsers know to initiate a WebRTC offer to this new participant.
    await manager.broadcast(
        meeting_code,
        {
            "type": "participant-joined",
            "participant_id": participant_id,
            "display_name": participant.display_name,
            "is_host": participant.is_host,
        },
        exclude=participant_id,
    )

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type in ("offer", "answer", "ice-candidate"):
                # Pure relay: stamp the sender id and forward to the intended target only.
                target = data.get("target")
                data["sender"] = participant_id
                if target is not None:
                    await manager.send_to(meeting_code, target, data)

            elif msg_type == "toggle-mute":
                participant.is_muted = bool(data.get("is_muted"))
                db.commit()
                await manager.broadcast(
                    meeting_code,
                    {"type": "peer-muted", "participant_id": participant_id, "is_muted": participant.is_muted},
                    exclude=participant_id,
                )

            elif msg_type == "toggle-video":
                participant.is_video_on = bool(data.get("is_video_on"))
                db.commit()
                await manager.broadcast(
                    meeting_code,
                    {"type": "peer-video", "participant_id": participant_id, "is_video_on": participant.is_video_on},
                    exclude=participant_id,
                )

    except WebSocketDisconnect:
        manager.disconnect(meeting_code, participant_id)
        participant.is_active = False
        db.commit()
        await manager.broadcast(meeting_code, {"type": "participant-left", "participant_id": participant_id})
    finally:
        db.close()
