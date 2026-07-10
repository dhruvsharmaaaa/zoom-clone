# Code Walkthrough & Evaluation Prep

Read this top to bottom once, then use it as a reference. It's organized so
you can explain the project in the order an interviewer will probably ask
about it: architecture → database → each feature's request flow → WebRTC →
likely questions.

---

## 1. High-level architecture (say this first)

"It's a three-tier app: a Next.js frontend, a FastAPI backend exposing a
REST API plus one WebSocket endpoint, and a SQLite database accessed
through SQLAlchemy. Video/audio itself doesn't flow through my server at
all — the backend's WebSocket is only used for **signaling** (the small
handshake messages two browsers need to find each other), and once that
handshake finishes, video streams directly peer-to-peer via WebRTC."

Draw this if asked:
```
Browser A  ──REST (join, schedule, mute-all)──▶  FastAPI ──▶ SQLite
Browser A  ──WebSocket (signaling)────────────▶  FastAPI (relays only)
Browser A  ◀──────── direct WebRTC video/audio ────────▶  Browser B
```

## 2. Database schema — `backend/app/models.py`

Two tables: `Meeting` and `Participant`, one-to-many (`Meeting.participants`).

**Why two tables instead of one?** Normalization. If I stored a
participant list as a JSON column on `Meeting`, then "mute everyone" would
mean reading the whole JSON blob, deserializing it, mutating it, and
writing the whole thing back — and I couldn't easily query "how many
people are active in this meeting right now" without doing that in Python
instead of SQL. As a separate table, mute-all is just:
```python
UPDATE participants SET is_muted = 1 WHERE meeting_id = ? AND is_host = 0
```

**Why `meeting_code` instead of the primary key `id` in URLs?**
`id` is an auto-incrementing integer (1, 2, 3...) — predictable and would
let anyone guess other people's meeting IDs by incrementing a number.
`meeting_code` is a random 10-digit string generated with Python's
`secrets` module (cryptographically secure randomness, not just `random`),
so meeting links can't be guessed or enumerated.

**Why is `is_host` on `Participant`, not a `host_id` column on `Meeting`?**
Because "host" in this session-based model means "the specific person who
is currently running the meeting," and that's a per-participant fact, not
a fixed property of the meeting row itself (the meeting's `host_name` field
just records who *scheduled/created* it, for display purposes). This
distinction matters if asked "what if the host leaves and rejoins" — in
this implementation, the FIRST currently-active participant is host, so if
everyone leaves and the original host rejoins alone, they become host
again automatically. Be upfront that this is a deliberate simplification;
a fuller system would let a host explicitly transfer host rights.

## 3. Feature-by-feature request flow

### New Meeting (Instant)
`NewMeetingModal.js` → `api.createInstantMeeting()` → `POST /api/meetings/instant`
→ `routers/meetings.py::create_instant_meeting` creates a `Meeting` row with
`meeting_type="instant"`, `status="active"`, and a fresh `meeting_code`
(default factory `generate_meeting_code()` in `models.py`) → returns the
meeting → frontend redirects to `/meeting/<code>?name=<host>`.

### Join Meeting
`JoinMeetingModal.js` extracts a meeting code out of either a raw ID or a
pasted invite URL (`extractMeetingCode()`, a regex pulling out the 9-10
digit run) → navigates to `/meeting/<code>?name=<name>`. The MEETING ROOM
PAGE does the actual validation by calling `api.joinMeeting()`, which hits
`POST /api/meetings/{code}/join`. If the code doesn't exist,
`_get_meeting_or_404` raises a 404 and the frontend shows an error screen
— that's the "validate meeting existence" requirement.

### Schedule Meeting
`ScheduleMeetingModal.js` collects title/description/date/time/duration,
combines date+time into an ISO datetime string, calls
`api.scheduleMeeting()` → `POST /api/meetings/schedule` → creates a
`Meeting` row with `status="scheduled"`. The dashboard's **Upcoming**
tab calls `GET /api/meetings/upcoming`, which filters
`status == "scheduled"` ordered by `scheduled_time`.

### Host Controls (mute all / remove participant)
Both are REST endpoints (`POST /mute-all`, `POST /remove/{id}`) that (a)
update the database, then (b) push a message down the WebSocket to
connected clients so the UI updates live without polling. This is why
`ws_manager.py`'s `broadcast()`/`send_to()` are called from inside the REST
router, not just the WebSocket route — the two are intentionally coupled:
REST changes the source of truth (DB), the WebSocket just tells already-
connected browsers "something changed."

## 4. WebRTC — the part you'll most likely be asked to explain

Read `frontend/src/lib/useMeetingRoom.js` top-to-bottom; the file's own
comments walk through the handshake. The short version to say out loud:

1. Each browser opens ONE WebSocket connection to the backend
   (`/ws/{meeting_code}/{participant_id}`) — used only for signaling.
2. WebRTC needs each browser to describe (a) what media it can send
   (an SDP "offer"/"answer") and (b) how to reach it over the network
   (ICE candidates). Neither of those exist yet when two people join a
   call — there's no way for two random browsers to find each other
   without a middleman. Our WebSocket is that middleman, but ONLY for this
   small handshake, not for actual video bytes.
3. Rule to avoid both sides offering simultaneously ("glare"): whoever
   joins LATER always initiates. On connecting, I fetch the current
   participant list via REST, then create an `RTCPeerConnection` and send
   an "offer" to each existing participant. They reply with an "answer".
   ICE candidates are exchanged as they're discovered by each browser's
   ICE agent (`onicecandidate`).
4. Once negotiation completes, `pc.ontrack` fires with the remote video/
   audio stream, which gets attached to a `<video>` element
   (`VideoTile.js`). From this point, media flows directly between
   browsers — you can verify this by opening browser dev tools' network
   tab: you won't see growing bytes on the WebSocket after the call
   connects.
5. Mesh limitation: every participant connects to every other participant
   directly (N² connections). Fine for a handful of people; a production
   Zoom uses an SFU (Selective Forwarding Unit) media server so each
   client only uploads once. If asked "how would you scale this," that's
   the answer.

## 5. Likely interview questions (with short answers)

**Q: Why FastAPI over Express/Django?**
A: Assignment specified Python/FastAPI. FastAPI gives async support (needed
for WebSockets), automatic OpenAPI docs, and Pydantic validation for free.

**Q: Why is validation split between Pydantic schemas and SQLAlchemy models?**
A: Pydantic schemas (`schemas.py`) validate what comes IN/OUT over HTTP —
e.g. rejecting a negative `duration_minutes`. SQLAlchemy models
(`models.py`) define the actual table structure. Keeping them separate
means the API's public shape can differ slightly from the DB's internal
shape (e.g. `invite_link` is a computed property, not a real column).

**Q: What happens if the WebSocket disconnects unexpectedly (e.g. wifi drop)?**
A: `signaling.py`'s `except WebSocketDisconnect` block marks that
participant inactive in the DB and broadcasts `participant-left` so other
clients tear down their peer connection to them. There's no reconnect/
retry logic implemented — a real product would add exponential-backoff
reconnection.

**Q: How do you prevent someone joining a meeting that already ended?**
A: `join_meeting` checks `meeting.status == "ended"` and returns HTTP 410
(Gone) before creating a participant row.

**Q: Why SQLite and not Postgres?**
A: Assignment specifies SQLite. Because the code goes through SQLAlchemy's
ORM rather than raw SQL, switching to Postgres later would only mean
changing the connection string in `database.py` — no query rewriting
required. That's worth saying if asked about production scaling.

**Q: Is this secure enough for production?**
A: No, and be honest about that if asked: there's no authentication (by
assignment design), CORS is wide open (`*`), and meeting codes, while
random, aren't rate-limited against brute-force guessing. These would all
need addressing for a real product.

## 6. Things to say if asked "what would you improve with more time"
- Add authentication (so meetings belong to real accounts).
- Switch from full-mesh WebRTC to an SFU (e.g. mediasoup/LiveKit) for
  scaling beyond ~6 participants.
- Persist chat and add real screen-share (currently a visual placeholder).
- Add reconnection logic on WebSocket drop.
- Move to Postgres + Alembic migrations for schema versioning.
