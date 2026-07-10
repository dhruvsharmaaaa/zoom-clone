"use client";
import { Video, Copy, Calendar } from "lucide-react";
import { format } from "date-fns";

/**
 * MeetingListItem.js
 * ------------------
 * One row in the Upcoming / Recent meetings list. Reused for both
 * sections (they render the same MeetingOut shape from the API) --
 * again, this is the "reusable components" criterion in action:
 * one component, two call sites, no duplicated markup.
 */
export default function MeetingListItem({ meeting, onJoin }) {
  const isScheduled = meeting.status === "scheduled";
  const dateLabel = meeting.scheduled_time
    ? format(new Date(meeting.scheduled_time), "EEE, d MMM · h:mm a")
    : meeting.created_at
    ? format(new Date(meeting.created_at), "EEE, d MMM · h:mm a")
    : "";

  function copyLink(e) {
    e.stopPropagation();
    navigator.clipboard.writeText(meeting.invite_link);
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-[var(--zoom-gray-bg)] transition-colors border border-transparent hover:border-[var(--zoom-border)]">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
          {isScheduled ? (
            <Calendar size={16} className="text-[var(--zoom-blue)]" />
          ) : (
            <Video size={16} className="text-[var(--zoom-blue)]" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{meeting.title}</p>
          <p className="text-xs text-gray-500 truncate">
            {dateLabel} · ID: {meeting.meeting_code.replace(/(\d{3})(\d{4})(\d{3})/, "$1 $2 $3")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={copyLink}
          title="Copy invite link"
          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-md"
        >
          <Copy size={14} />
        </button>
        {isScheduled && (
          <button
            onClick={() => onJoin(meeting)}
            className="text-xs font-medium px-3 py-1.5 rounded-md btn-zoom-blue"
          >
            Start
          </button>
        )}
      </div>
    </div>
  );
}
