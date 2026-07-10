"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "./Modal";

/**
 * JoinMeetingModal.js
 * -------------------
 * Handles the "Join Meeting" flow. Accepts either:
 *   - a raw 10-digit Meeting ID, or
 *   - a full invite link (e.g. http://localhost:3000/meeting/1234567890)
 * and extracts the meeting code either way, then asks for a display
 * name before navigating to the meeting room.
 *
 * We don't call the backend here to "validate" -- that check happens
 * on the meeting room page itself via api.joinMeeting(), which is the
 * single source of truth for "does this meeting exist / can I join".
 * This avoids validating twice.
 */
function extractMeetingCode(input) {
  const trimmed = input.trim();
  const match = trimmed.match(/(\d{9,10})/); // pulls digits out of a pasted link too
  return match ? match[1] : trimmed.replace(/\s+/g, "");
}

export default function JoinMeetingModal({ onClose }) {
  const [meetingInput, setMeetingInput] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  function handleJoin(e) {
    e.preventDefault();
    const code = extractMeetingCode(meetingInput);
    if (!code) {
      setError("Enter a Meeting ID or invite link.");
      return;
    }
    if (!displayName.trim()) {
      setError("Enter your name so others can see who you are.");
      return;
    }
    // Pass display name via query param; the meeting room page reads it
    // and performs the actual join API call (where real validation happens).
    router.push(`/meeting/${code}?name=${encodeURIComponent(displayName.trim())}`);
  }

  return (
    <Modal title="Join Meeting" onClose={onClose}>
      <form onSubmit={handleJoin} className="flex flex-col gap-4">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">
            Meeting ID or invite link
          </label>
          <input
            autoFocus
            value={meetingInput}
            onChange={(e) => setMeetingInput(e.target.value)}
            placeholder="e.g. 842 1937 5610"
            className="w-full px-3 py-2.5 rounded-md border border-[var(--zoom-border)] outline-none focus:border-[var(--zoom-blue)] text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Your Name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Dhruv Sharma"
            className="w-full px-3 py-2.5 rounded-md border border-[var(--zoom-border)] outline-none focus:border-[var(--zoom-blue)] text-sm"
          />
        </div>
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <button
          type="submit"
          className="btn-zoom-blue rounded-md py-2.5 font-medium text-sm mt-1"
        >
          Join
        </button>
      </form>
    </Modal>
  );
}
