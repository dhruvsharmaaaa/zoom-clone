"""
main.py
-------
FastAPI application entrypoint. Wires together:
  - CORS (so the Next.js frontend on a different port/domain can call us)
  - DB table creation on startup
  - The two routers: meetings (REST) and signaling (WebSocket)
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import meetings, signaling

app = FastAPI(title="Zoom Clone API", version="1.0.0")

# Allow the Next.js dev server (and your deployed frontend) to call this API.
# In production, replace "*" with your actual deployed frontend URL for safety.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    # Creates tables if they don't exist yet. Safe to call every startup.
    Base.metadata.create_all(bind=engine)


app.include_router(meetings.router)
app.include_router(signaling.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
