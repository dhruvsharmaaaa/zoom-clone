/**
 * lib/api.js
 * ----------
 * Every single call from the frontend to our FastAPI backend goes
 * through this file. Centralizing it means:
 *   1. Only ONE place needs the base URL / error handling logic.
 *   2. Components stay clean -- they just call `createInstantMeeting()`
 *      instead of hand-writing fetch() + error handling everywhere.
 *
 * API_BASE_URL comes from an environment variable so the SAME code
 * works locally (http://localhost:8000) and in production (your
 * deployed backend URL on Render/Railway) -- you just change the
 * .env value, not the code.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const WS_BASE_URL = API_BASE_URL.replace(/^http/, "ws");

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let detail = "Something went wrong";
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch (_) {}
    throw new Error(detail);
  }
  // Some endpoints (like /leave) return no useful body, but json() is safe to call.
  return res.json();
}

export const api = {
  getUpcoming: () => request("/api/meetings/upcoming"),
  getRecent: () => request("/api/meetings/recent"),
  getMeeting: (code) => request(`/api/meetings/${code}`),

  createInstantMeeting: (hostName, title) =>
    request("/api/meetings/instant", {
      method: "POST",
      body: JSON.stringify({ host_name: hostName, title }),
    }),

  scheduleMeeting: (payload) =>
    request("/api/meetings/schedule", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  joinMeeting: (code, displayName) =>
    request(`/api/meetings/${code}/join`, {
      method: "POST",
      body: JSON.stringify({ display_name: displayName }),
    }),

  leaveMeeting: (code, participantId) =>
    request(`/api/meetings/${code}/leave/${participantId}`, { method: "POST" }),

  listParticipants: (code) => request(`/api/meetings/${code}/participants`),

  muteAll: (code) => request(`/api/meetings/${code}/mute-all`, { method: "POST" }),

  removeParticipant: (code, participantId) =>
    request(`/api/meetings/${code}/remove/${participantId}`, { method: "POST" }),
};
