"use client";
import { Mic, MicOff, Video, VideoOff, Users, PhoneOff, MonitorUp, MoreHorizontal } from "lucide-react";

/**
 * ControlBar.js
 * -------------
 * The bottom toolbar in the meeting room -- mirrors Zoom's real
 * control bar layout (mute, video, participants, share screen, more,
 * end/leave in red on the far right).
 */
export default function ControlBar({
  isMuted,
  isVideoOn,
  onToggleMute,
  onToggleVideo,
  onToggleParticipants,
  participantCount,
  isHost,
  onLeave,
}) {
  return (
    <div className="flex items-center justify-center gap-3 py-4 bg-[#1C1C1E] border-t border-white/10">
      <ControlButton
        active={!isMuted}
        icon={isMuted ? MicOff : Mic}
        label={isMuted ? "Unmute" : "Mute"}
        danger={isMuted}
        onClick={onToggleMute}
      />
      <ControlButton
        active={isVideoOn}
        icon={isVideoOn ? Video : VideoOff}
        label={isVideoOn ? "Stop Video" : "Start Video"}
        danger={!isVideoOn}
        onClick={onToggleVideo}
      />
      <ControlButton
        icon={Users}
        label={`Participants (${participantCount})`}
        onClick={onToggleParticipants}
      />
      <ControlButton icon={MonitorUp} label="Share Screen" disabled />
      <ControlButton icon={MoreHorizontal} label="More" disabled />

      <button
        onClick={onLeave}
        className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg text-white bg-[var(--zoom-danger)] hover:bg-red-600 transition-colors ml-4"
      >
        <PhoneOff size={18} />
        <span className="text-[11px] font-medium">{isHost ? "End" : "Leave"}</span>
      </button>
    </div>
  );
}

function ControlButton({ icon: Icon, label, onClick, active = true, danger = false, disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
        disabled
          ? "text-gray-600 cursor-not-allowed"
          : danger
          ? "text-red-400 bg-white/5 hover:bg-white/10"
          : "text-gray-200 bg-white/5 hover:bg-white/10"
      }`}
    >
      <Icon size={19} />
      {label}
    </button>
  );
}
