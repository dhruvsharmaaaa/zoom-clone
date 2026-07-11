"use client";
import { useEffect, useRef } from "react";
import { MicOff, Crown } from "lucide-react";

/**
 * VideoTile.js
 * ------------
 * Renders one participant's video (or an avatar placeholder if their
 * camera is off / not yet connected). Used for both the local
 * self-view tile and every remote peer tile in the grid.
 */
export default function VideoTile({ stream, name, isMuted, isVideoOn, isHost, isSelf }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  // The VIDEO element only ever cares about showing the picture. Its own
  // effect no longer needs to depend on isVideoOn at all -- audio is now
  // handled entirely separately below.
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  // The AUDIO element is COMPLETELY INDEPENDENT of the camera toggle.
  // This is the actual fix: previously, one shared <video> element
  // carried both picture and sound, so anything that touched it for the
  // camera toggle (mounting/unmounting, reassigning srcObject, calling
  // play() again) could interrupt its audio too. By giving audio its own
  // dedicated element whose effect depends ONLY on `stream` -- never on
  // isVideoOn -- turning the camera on/off can no longer affect sound
  // even indirectly. We skip this for the local self-tile to avoid
  // hearing an echo of your own mic.
  useEffect(() => {
    if (!isSelf && audioRef.current && stream) {
      audioRef.current.srcObject = stream;
      audioRef.current.play().catch(() => {});
    }
  }, [stream, isSelf]);

  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative bg-[var(--zoom-tile-bg)] rounded-lg overflow-hidden aspect-video flex items-center justify-center">
      {/* Picture only -- always muted, since audio now plays through the
          separate <audio> element below (for remote peers) or not at
          all (for our own self-preview tile, to avoid echo). */}
      {stream && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover [transform:scaleX(-1)] transition-opacity ${
            isVideoOn ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        />
      )}

      {/* Sound only -- invisible, always mounted for remote peers,
          entirely unaffected by camera on/off. */}
      {!isSelf && stream && <audio ref={audioRef} autoPlay />}

      {!isVideoOn && (
        <div className="relative z-10 w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-semibold">
          {initials}
        </div>
      )}

      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/50 rounded px-2 py-1 z-10">
        {isHost && <Crown size={12} className="text-yellow-400" />}
        <span className="text-white text-xs font-medium">{name} {isSelf && "(You)"}</span>
      </div>

      {isMuted && (
        <div className="absolute bottom-2 right-2 bg-black/50 rounded p-1.5 z-10">
          <MicOff size={13} className="text-red-400" />
        </div>
      )}
    </div>
  );
}