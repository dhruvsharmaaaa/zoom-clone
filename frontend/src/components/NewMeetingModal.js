"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "./Modal";
import { api } from "@/lib/api";

/**
 * NewMeetingModal.js
 * ------------------
 * "New Meeting" flow: asks for a display name (host's own name),
 * calls the backend to create + immediately activate an instant
 * meeting (generates the unique meeting_code server-side), then
 * redirects straight into the meeting room as the host.
 *
 * We store `is_host_of_<code>` in sessionStorage so that when the
 * meeting room page runs its own join call, it knows this browser
 * created the meeting (used only for the "you are the host" UI badge
 * -- the backend independently also assigns is_host to whoever is the
 * FIRST participant to join, so the two can never disagree).
 */
export default function NewMeetingModal({ onClose }) {
  const [displayName, setDisplayName] = useState("Dhruv Sharma");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleStart(e) {
    e.preventDefault();
    if (!displayName.trim()) {
      setError("Enter your name first.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const meeting = await api.createInstantMeeting(displayName.trim(), "Instant Meeting");
      router.push(`/meeting/${meeting.meeting_code}?name=${encodeURIComponent(displayName.trim())}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <Modal title="Start an Instant Meeting" onClose={onClose}>
      <form onSubmit={handleStart} className="flex flex-col gap-4">
        <p className="text-sm text-gray-500">
          A unique Meeting ID and invite link will be generated instantly.
        </p>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Your Name</label>
          <input
            autoFocus
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-md border border-[var(--zoom-border)] outline-none focus:border-[var(--zoom-blue)] text-sm"
          />
        </div>
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="btn-zoom-blue rounded-md py-2.5 font-medium text-sm mt-1 disabled:opacity-60"
        >
          {loading ? "Starting…" : "Start Meeting"}
        </button>
      </form>
    </Modal>
  );
}
