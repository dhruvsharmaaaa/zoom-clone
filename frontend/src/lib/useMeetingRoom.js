"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { WS_BASE_URL, api } from "@/lib/api";

/**
 * useMeetingRoom.js
 * -----------------
 * This hook is the "engine" behind the meeting room. It's pulled out
 * of the page component so the UI (page.js) stays focused on
 * rendering, and this file stays focused on: media + networking.
 *
 * HOW THE VIDEO CALL ACTUALLY WORKS (mesh topology):
 * Every participant opens a direct RTCPeerConnection to every OTHER
 * participant (this is called a "mesh" -- fine for small meetings,
 * which is what this assignment needs; a real Zoom uses a media
 * server (SFU) for large calls, but a full mesh is the simplest
 * correct way to demonstrate real peer-to-peer video).
 *
 * WHO INITIATES THE CONNECTION?
 * To avoid two browsers simultaneously sending each other offers
 * (a race condition called "glare"), we use one simple rule:
 * "the participant who joins LATER initiates the offer to everyone
 * already in the room." So:
 *   1. I join. I fetch the current active participant list via REST.
 *   2. For each existing participant, I create a peer connection and
 *      send them a WebRTC "offer" over the WebSocket.
 *   3. They receive my offer, create their own peer connection,
 *      set my offer as the remote description, and send back an
 *      "answer".
 *   4. Both sides exchange ICE candidates (network path info) until a
 *      direct connection is established. From that point on, video/
 *      audio flows PEER-TO-PEER -- the backend server is no longer
 *      involved in the media itself, only in signaling.
 */

const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

export function useMeetingRoom(meetingCode, displayName) {
  const [meeting, setMeeting] = useState(null);
  const [me, setMe] = useState(null); // { id, display_name, is_host }
  const [participants, setParticipants] = useState([]); // remote participants: {id, display_name, is_host, is_muted, is_video_on}
  const [remoteStreams, setRemoteStreams] = useState({}); // id -> MediaStream
  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [status, setStatus] = useState("connecting"); // connecting | in-call | ended | error
  const [errorMessage, setErrorMessage] = useState("");

  const wsRef = useRef(null);
  const peersRef = useRef({}); // id -> RTCPeerConnection
  const pendingCandidatesRef = useRef({}); // id -> candidate[] (queued until remote description is set)
  const localStreamRef = useRef(null);

  const createPeerConnection = useCallback((peerId) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Attach our own mic/camera tracks so the other side receives them.
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.ontrack = (event) => {
      setRemoteStreams((prev) => ({ ...prev, [peerId]: event.streams[0] }));
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendMessage({ type: "ice-candidate", target: peerId, candidate: event.candidate });
      }
    };

    peersRef.current[peerId] = pc;
    return pc;
  }, []);

  const sendMessage = (msg) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  const flushQueuedCandidates = async (peerId, pc) => {
    const queued = pendingCandidatesRef.current[peerId] || [];
    for (const candidate of queued) {
      await pc.addIceCandidate(candidate).catch(() => {});
    }
    pendingCandidatesRef.current[peerId] = [];
  };

  // ---- Main setup effect: get media, join via REST, open WebSocket ----
  useEffect(() => {
    let cancelled = false;

    // Guard: the meeting room page calls this hook unconditionally (required
    // by React's Rules of Hooks) even before we know the user's display
    // name. When meetingCode is null we simply skip all setup -- this
    // avoids prompting for camera/mic permission before the pre-join
    // name screen has even been submitted.
    if (!meetingCode) {
      return;
    }

    async function setup() {
      try {
        // 1. Get camera + mic access.
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (cancelled) return;
        localStreamRef.current = stream;
        setLocalStream(stream);

        // 2. Tell the backend we're joining (validates the meeting exists,
        //    creates our Participant row, tells us if we're the host).
        const { participant, meeting: meetingData } = await api.joinMeeting(meetingCode, displayName);
        if (cancelled) return;
        setMe(participant);
        setMeeting(meetingData);

        // 3. Find out who's already in the room (REST, not WS) so we know
        //    who to send offers to.
        const existing = (await api.listParticipants(meetingCode)).filter(
          (p) => p.id !== participant.id
        );
        setParticipants(existing);

        // 4. Open the signaling WebSocket.
        const ws = new WebSocket(`${WS_BASE_URL}/ws/${meetingCode}/${participant.id}`);
        wsRef.current = ws;

        ws.onopen = async () => {
          setStatus("in-call");
          // I'm the newcomer -- initiate an offer to every existing participant.
          for (const peer of existing) {
            const pc = createPeerConnection(peer.id);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            sendMessage({ type: "offer", target: peer.id, sdp: offer });
          }
        };

        ws.onmessage = async (event) => {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case "participant-joined": {
              // Someone new joined AFTER me. Just track them in the list;
              // THEY will send me an offer (per our "newcomer initiates" rule).
              setParticipants((prev) => {
                if (prev.some((p) => p.id === data.participant_id)) return prev;
                return [
                  ...prev,
                  { id: data.participant_id, display_name: data.display_name, is_host: data.is_host, is_muted: false, is_video_on: true },
                ];
              });
              break;
            }

            case "offer": {
              const pc = createPeerConnection(data.sender);
              await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
              await flushQueuedCandidates(data.sender, pc);
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              sendMessage({ type: "answer", target: data.sender, sdp: answer });
              break;
            }

            case "answer": {
              const pc = peersRef.current[data.sender];
              if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
                await flushQueuedCandidates(data.sender, pc);
              }
              break;
            }

            case "ice-candidate": {
              const pc = peersRef.current[data.sender];
              const candidate = new RTCIceCandidate(data.candidate);
              if (pc && pc.remoteDescription) {
                await pc.addIceCandidate(candidate).catch(() => {});
              } else {
                pendingCandidatesRef.current[data.sender] = pendingCandidatesRef.current[data.sender] || [];
                pendingCandidatesRef.current[data.sender].push(candidate);
              }
              break;
            }

            case "participant-left": {
              const pid = data.participant_id;
              if (peersRef.current[pid]) {
                peersRef.current[pid].close();
                delete peersRef.current[pid];
              }
              setParticipants((prev) => prev.filter((p) => p.id !== pid));
              setRemoteStreams((prev) => {
                const next = { ...prev };
                delete next[pid];
                return next;
              });
              break;
            }

            case "peer-muted": {
              setParticipants((prev) =>
                prev.map((p) => (p.id === data.participant_id ? { ...p, is_muted: data.is_muted } : p))
              );
              break;
            }

            case "peer-video": {
              setParticipants((prev) =>
                prev.map((p) => (p.id === data.participant_id ? { ...p, is_video_on: data.is_video_on } : p))
              );
              break;
            }

            case "force-mute-all": {
              // Host muted everyone: mirror it locally.
              if (localStreamRef.current) {
                localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
              }
              setIsMuted(true);
              sendMessage({ type: "toggle-mute", is_muted: true });
              break;
            }

            case "removed-by-host": {
              setStatus("ended");
              setErrorMessage("The host removed you from this meeting.");
              cleanup();
              break;
            }

            default:
              break;
          }
        };

        ws.onerror = () => {
          if (!cancelled) setStatus("error");
        };
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setErrorMessage(err.message || "Could not join the meeting.");
        }
      }
    }

    setup();

    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingCode, displayName]);

  function cleanup() {
    Object.values(peersRef.current).forEach((pc) => pc.close());
    peersRef.current = {};
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
  }

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    const newMuted = !isMuted;
    localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !newMuted));
    setIsMuted(newMuted);
    sendMessage({ type: "toggle-mute", is_muted: newMuted });
  };

const toggleVideo = async () => {
    if (!localStreamRef.current) return;

    if (isVideoOn) {
      // Turning OFF: fully STOP the hardware track (releases the camera,
      // turns off the camera indicator light) rather than just setting
      // `.enabled = false`. Some laptops/OSes power down a video track
      // that's merely "disabled" for a bit, and it never produces frames
      // again afterwards -- that's the black-screen-stuck bug. Stopping
      // and later re-acquiring a fresh track avoids that entirely.
      localStreamRef.current.getVideoTracks().forEach((t) => t.stop());
      setIsVideoOn(false);
      sendMessage({ type: "toggle-video", is_video_on: false });
      return;
    }

    // Turning ON: request a brand new camera track and swap it into
    // every existing peer connection with replaceTrack(). replaceTrack
    // does NOT require renegotiating the whole WebRTC connection -- the
    // other side keeps receiving on the same media line, just with a
    // fresh video source.
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const newTrack = newStream.getVideoTracks()[0];

      const oldTrack = localStreamRef.current.getVideoTracks()[0];
      if (oldTrack) localStreamRef.current.removeTrack(oldTrack);
      localStreamRef.current.addTrack(newTrack);

      Object.values(peersRef.current).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
        if (sender) sender.replaceTrack(newTrack);
      });

      setLocalStream(localStreamRef.current);
      setIsVideoOn(true);
      sendMessage({ type: "toggle-video", is_video_on: true });
    } catch (err) {
      console.error("Could not re-enable camera:", err);
    }
  };

  const leaveMeeting = async () => {
    if (me) {
      await api.leaveMeeting(meetingCode, me.id).catch(() => {});
    }
    cleanup();
    setStatus("ended");
  };

  const muteAll = async () => {
    await api.muteAll(meetingCode).catch(() => {});
  };

  const removeParticipant = async (participantId) => {
    await api.removeParticipant(meetingCode, participantId).catch(() => {});
  };

  return {
    meeting,
    me,
    participants,
    remoteStreams,
    localStream,
    isMuted,
    isVideoOn,
    status,
    errorMessage,
    toggleMute,
    toggleVideo,
    leaveMeeting,
    muteAll,
    removeParticipant,
  };
}
