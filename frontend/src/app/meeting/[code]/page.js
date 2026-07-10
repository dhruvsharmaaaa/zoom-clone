"use client";
import { useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useMeetingRoom } from "@/lib/useMeetingRoom";
import VideoTile from "@/components/VideoTile";
import ControlBar from "@/components/ControlBar";
import ParticipantsPanel from "@/components/ParticipantsPanel";
import PreJoinScreen from "@/components/PreJoinScreen";

/**
 * app/meeting/[code]/page.js
 * --------------------------
 * The meeting room. [code] is a Next.js DYNAMIC ROUTE SEGMENT --
 * whatever the user navigates to after /meeting/ (e.g.
 * /meeting/4844681967) becomes available as params.code here.
 *
 * Flow:
 *   1. If no ?name= in the URL, show PreJoinScreen first.
 *   2. Once we have a name, useMeetingRoom() does all the real work
 *      (getUserMedia, REST join call, WebSocket signaling, WebRTC).
 *   3. Render the video grid + control bar + optional participants panel.
 */
export default function MeetingRoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const meetingCode = params.code;

  const [displayName, setDisplayName] = useState(searchParams.get("name") || "");
  const [showParticipants, setShowParticipants] = useState(false);

  const room = useMeetingRoom(displayName ? meetingCode : null, displayName);

  if (!displayName) {
    return <PreJoinScreen meetingCode={meetingCode} onJoin={setDisplayName} />;
  }

  if (room.status === "error") {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[var(--zoom-room-bg)] text-white gap-4">
        <p className="text-lg font-medium">Could not join this meeting</p>
        <p className="text-gray-400 text-sm">{room.errorMessage}</p>
        <button onClick={() => router.push("/")} className="btn-zoom-blue px-4 py-2 rounded-md text-sm mt-2">
          Back to Home
        </button>
      </div>
    );
  }

  if (room.status === "ended") {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[var(--zoom-room-bg)] text-white gap-4">
        <p className="text-lg font-medium">
          {room.errorMessage || "You left the meeting"}
        </p>
        <button onClick={() => router.push("/")} className="btn-zoom-blue px-4 py-2 rounded-md text-sm mt-2">
          Back to Home
        </button>
      </div>
    );
  }

  const totalTiles = 1 + room.participants.length;
  const gridColsClass =
    totalTiles <= 1 ? "grid-cols-1" : totalTiles <= 4 ? "grid-cols-2" : "grid-cols-3";

  return (
    <div className="h-screen flex flex-col bg-[var(--zoom-room-bg)]">
      {/* Top info bar */}
      <div className="flex items-center justify-between px-5 py-3 text-gray-300 text-xs">
        <span>{room.meeting?.title || "Meeting"} · ID: {meetingCode}</span>
        <span>{room.status === "connecting" ? "Connecting…" : "Connected"}</span>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-4 overflow-y-auto">
          <div className={`grid ${gridColsClass} gap-4 max-w-6xl mx-auto`}>
            <VideoTile
              stream={room.localStream}
              name={displayName}
              isMuted={room.isMuted}
              isVideoOn={room.isVideoOn}
              isHost={room.me?.is_host}
              isSelf
            />
            {room.participants.map((p) => (
              <VideoTile
                key={p.id}
                stream={room.remoteStreams[p.id]}
                name={p.display_name}
                isMuted={p.is_muted}
                isVideoOn={p.is_video_on !== false}
                isHost={p.is_host}
              />
            ))}
          </div>
        </div>

        {showParticipants && (
          <ParticipantsPanel
            me={room.me}
            participants={room.participants}
            isHost={!!room.me?.is_host}
            onClose={() => setShowParticipants(false)}
            onMuteAll={room.muteAll}
            onRemove={room.removeParticipant}
          />
        )}
      </div>

      <ControlBar
        isMuted={room.isMuted}
        isVideoOn={room.isVideoOn}
        onToggleMute={room.toggleMute}
        onToggleVideo={room.toggleVideo}
        onToggleParticipants={() => setShowParticipants((s) => !s)}
        participantCount={totalTiles}
        isHost={!!room.me?.is_host}
        onLeave={async () => {
          await room.leaveMeeting();
          router.push("/");
        }}
      />
    </div>
  );
}
