"""
ws_manager.py
-------------
Handles real-time communication for a meeting room over WebSockets.

Two jobs happen over the same socket connection:

1. WebRTC SIGNALING - browsers can't discover each other's network
   address on their own. When participant A wants to send video to
   participant B, A creates a WebRTC "offer" (a blob of connection
   info) and needs to hand it to B somehow. We use this WebSocket as
   that hand-off channel: A sends {type: "offer", ...} to the server,
   the server relays it to B, B replies with {type: "answer", ...},
   and the server relays that back to A. After the offer/answer
   exchange (plus ICE candidates), the browsers open a DIRECT
   peer-to-peer video/audio stream -- our server never touches the
   actual video bytes, only the tiny handshake messages.

2. ROOM STATE - broadcasting participant-list updates and host
   actions (mute-all, remove-participant) to everyone in the room.

We keep connections in memory (a plain Python dict) rather than in the
database because a live socket connection isn't something that
survives a server restart anyway -- it's runtime state, not data we
need to persist.
"""
from typing import Dict
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # meeting_code -> { participant_id (int) -> WebSocket }
        self.rooms: Dict[str, Dict[int, WebSocket]] = {}

    async def connect(self, meeting_code: str, participant_id: int, websocket: WebSocket):
        await websocket.accept()
        self.rooms.setdefault(meeting_code, {})[participant_id] = websocket

    def disconnect(self, meeting_code: str, participant_id: int):
        room = self.rooms.get(meeting_code)
        if room and participant_id in room:
            del room[participant_id]
        if room is not None and len(room) == 0:
            self.rooms.pop(meeting_code, None)

    async def send_to(self, meeting_code: str, participant_id: int, message: dict):
        room = self.rooms.get(meeting_code, {})
        ws = room.get(participant_id)
        if ws:
            await ws.send_json(message)

    async def broadcast(self, meeting_code: str, message: dict, exclude: int = None):
        room = self.rooms.get(meeting_code, {})
        for pid, ws in list(room.items()):
            if pid == exclude:
                continue
            await ws.send_json(message)

    def participant_ids(self, meeting_code: str):
        return list(self.rooms.get(meeting_code, {}).keys())


manager = ConnectionManager()
