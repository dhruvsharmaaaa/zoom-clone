"use client";
import { useState } from "react";
import { Video } from "lucide-react";

/**
 * PreJoinScreen.js
 * ----------------
 * Shown when someone opens a meeting link directly (no ?name= in the
 * URL) -- satisfies "Enter display name before joining" from the
 * assignment. Mirrors Zoom's real pre-join screen (dark themed,
 * centered card, name field, Join button).
 */
export default function PreJoinScreen({ meetingCode, onJoin }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name to join.");
      return;
    }
    onJoin(name.trim());
  }

  return (
    <div className="h-screen flex items-center justify-center bg-[var(--zoom-room-bg)]">
      <div className="bg-[#232325] rounded-xl p-8 w-full max-w-sm text-center">
        <div className="w-14 h-14 rounded-2xl bg-[var(--zoom-blue)] flex items-center justify-center mx-auto mb-4">
          <Video size={26} className="text-white" />
        </div>
        <h1 className="text-white font-semibold text-lg mb-1">Ready to join?</h1>
        <p className="text-gray-400 text-xs mb-6">Meeting ID: {meetingCode}</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full px-3 py-2.5 rounded-md bg-[#2C2C2E] text-white text-sm outline-none border border-white/10 focus:border-[var(--zoom-blue)]"
          />
          {error && <p className="text-red-400 text-xs text-left">{error}</p>}
          <button
            type="submit"
            className="btn-zoom-blue rounded-md py-2.5 font-medium text-sm mt-1"
          >
            Join Meeting
          </button>
        </form>
      </div>
    </div>
  );
}
