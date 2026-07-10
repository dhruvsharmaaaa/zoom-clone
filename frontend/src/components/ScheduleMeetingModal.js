"use client";
import { useState } from "react";
import Modal from "./Modal";
import { api } from "@/lib/api";

/**
 * ScheduleMeetingModal.js
 * -----------------------
 * "Schedule Meeting" flow: title, description, date+time picker,
 * duration. On submit, POSTs to /api/meetings/schedule which stores
 * a row with status="scheduled" and an auto-generated meeting_code +
 * invite link. `onScheduled` callback lets the parent (dashboard page)
 * refresh its Upcoming Meetings list without a full page reload.
 */
export default function ScheduleMeetingModal({ onClose, onScheduled }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSchedule(e) {
    e.preventDefault();
    if (!title.trim() || !date || !time) {
      setError("Title, date and time are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const scheduled_time = new Date(`${date}T${time}`).toISOString();
      const meeting = await api.scheduleMeeting({
        title: title.trim(),
        description: description.trim() || null,
        host_name: "Dhruv Sharma",
        scheduled_time,
        duration_minutes: Number(duration),
      });
      onScheduled?.(meeting);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Schedule a Meeting" onClose={onClose} width="max-w-lg">
      <form onSubmit={handleSchedule} className="flex flex-col gap-4">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Title</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Weekly Team Sync"
            className="w-full px-3 py-2.5 rounded-md border border-[var(--zoom-border)] outline-none focus:border-[var(--zoom-blue)] text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2.5 rounded-md border border-[var(--zoom-border)] outline-none focus:border-[var(--zoom-blue)] text-sm resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-md border border-[var(--zoom-border)] outline-none focus:border-[var(--zoom-blue)] text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2.5 rounded-md border border-[var(--zoom-border)] outline-none focus:border-[var(--zoom-blue)] text-sm"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Duration (minutes)</label>
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full px-3 py-2.5 rounded-md border border-[var(--zoom-border)] outline-none focus:border-[var(--zoom-blue)] text-sm"
          >
            {[15, 30, 45, 60, 90, 120].map((m) => (
              <option key={m} value={m}>{m} minutes</option>
            ))}
          </select>
        </div>
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="btn-zoom-blue rounded-md py-2.5 font-medium text-sm mt-1 disabled:opacity-60"
        >
          {loading ? "Scheduling…" : "Schedule"}
        </button>
      </form>
    </Modal>
  );
}
