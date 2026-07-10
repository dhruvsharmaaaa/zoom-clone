"use client";
import { X, MicOff, Crown, UserMinus } from "lucide-react";

/**
 * ParticipantsPanel.js
 * --------------------
 * Slide-in panel listing everyone in the call. Only rendered with
 * host-only buttons (Mute All / remove-participant "X") when the
 * current user `isHost` -- this is the "Host controls" requirement
 * from the assignment.
 */
export default function ParticipantsPanel({
  me,
  participants,
  isHost,
  onClose,
  onMuteAll,
  onRemove,
}) {
  const all = me ? [{ ...me, isSelf: true }, ...participants] : participants;

  return (
    <div className="w-72 bg-white border-l border-[var(--zoom-border)] flex flex-col shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--zoom-border)]">
        <h3 className="font-semibold text-sm">Participants ({all.length})</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin py-2">
        {all.map((p) => (
          <div key={p.isSelf ? "self" : p.id} className="flex items-center justify-between px-4 py-2 hover:bg-gray-50">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-semibold shrink-0">
                {(p.display_name || "?").slice(0, 2).toUpperCase()}
              </div>
              <span className="text-sm truncate">
                {p.display_name} {p.isSelf && "(You)"}
              </span>
              {p.is_host && <Crown size={13} className="text-yellow-500 shrink-0" />}
              {p.is_muted && <MicOff size={13} className="text-red-500 shrink-0" />}
            </div>

            {isHost && !p.isSelf && (
              <button
                onClick={() => onRemove(p.id)}
                title="Remove from meeting"
                className="text-gray-400 hover:text-red-600 p-1"
              >
                <UserMinus size={15} />
              </button>
            )}
          </div>
        ))}
      </div>

      {isHost && (
        <div className="p-3 border-t border-[var(--zoom-border)]">
          <button
            onClick={onMuteAll}
            className="w-full text-sm font-medium py-2 rounded-md btn-zoom-blue"
          >
            Mute All
          </button>
        </div>
      )}
    </div>
  );
}
