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

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((err) => {
        console.warn("[VideoTile] play() was blocked/failed:", err.message);
      });
    }
  }, [stream, isVideoOn]);

  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative bg-[var(--zoom-tile-bg)] rounded-lg overflow-hidden aspect-video flex items-center justify-center">
      {/*
        IMPORTANT: the <video> element stays mounted the whole time the
        stream exists -- it's never removed just because the camera is
        off. That's because this SAME element is what plays the peer's
        AUDIO track too. Previously, turning the picture off unmounted
        this element entirely (replaced by the avatar div), which
        silently killed that person's audio for everyone else as a side
        effect -- turning off your camera should never turn off your mic.
        Now we only visually hide the picture with opacity when the
        camera is off; audio keeps flowing regardless.
      */}
      {stream && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isSelf}
          className={`absolute inset-0 w-full h-full object-cover [transform:scaleX(-1)] transition-opacity ${
            isVideoOn ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        />
      )}

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