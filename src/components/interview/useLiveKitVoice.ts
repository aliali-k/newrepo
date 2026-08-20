"use client";

// Real-time voice pipeline wiring (Master Build Doc §7 / gap-analysis #1).
// The backend already runs the full LiveKit + Pipecat + Groq Whisper +
// Edge-TTS loop server-side (app/voice_agent.py) and updates the session's
// transcript directly — this hook's only job is to get the candidate's mic
// into that LiveKit room and the AI's TTS audio back out, with barge-in
// working naturally because LiveKit/Pipecat handle interruption server-side
// the moment they see new mic audio.
//
// Because the agent writes transcript_events straight into session storage
// (not over a data channel), the caller should poll GET /api/interview/session
// on a short interval while connected so captions/format/phase stay live —
// see the `pollMs` option.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ConnectionState,
  DisconnectReason,
  LocalParticipant,
  Room,
  RoomEvent,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  Track,
} from "livekit-client";
import { api, ApiError } from "@/lib/api";

export type VoiceStatus =
  | "idle"
  | "requesting_token"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error"
  | "unsupported";

interface UseLiveKitVoiceOptions {
  sessionId: string;
  candidateId: string;
  onTranscriptRefresh?: () => void;
  pollMs?: number;
}

export function useLiveKitVoice({ sessionId, candidateId, onTranscriptRefresh, pollMs = 1500 }: UseLiveKitVoiceOptions) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState("");
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [micMuted, setMicMuted] = useState(false);

  const roomRef = useRef<Room | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectingRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    if (!onTranscriptRefresh) return;
    pollRef.current = setInterval(onTranscriptRefresh, pollMs);
  }, [onTranscriptRefresh, pollMs, stopPolling]);

  const attachRoomListeners = useCallback(
    (room: Room) => {
      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, _pub: RemoteTrackPublication, participant: RemoteParticipant) => {
        if (track.kind === Track.Kind.Audio) {
          const el = track.attach();
          el.autoplay = true;
          document.body.appendChild(el);
          audioElRef.current = el;
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        track.detach().forEach((el) => el.remove());
      });

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const aiTalking = speakers.some((p) => p.identity?.startsWith("jeeindia-ai-"));
        setAiSpeaking(aiTalking);
      });

      room.on(RoomEvent.Disconnected, async (reason?: DisconnectReason) => {
        stopPolling();
        if (reconnectingRef.current) return;
        setStatus("reconnecting");
        api.reportEvent(sessionId, "voice_connection_dropped", String(reason ?? "unknown"));
        try {
          reconnectingRef.current = true;
          await api.voiceReconnect(sessionId);
          await joinRoom();
        } catch {
          setStatus("disconnected");
        } finally {
          reconnectingRef.current = false;
        }
      });

      room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        if (state === ConnectionState.Connected) setStatus("connected");
        else if (state === ConnectionState.Reconnecting) setStatus("reconnecting");
      });
    },
    [sessionId, stopPolling]
  );

  const joinRoom = useCallback(async () => {
    setError("");
    setStatus("requesting_token");
    let tokenRes: { url?: string; token?: string; room?: string };
    try {
      tokenRes = await api.voiceToken(sessionId, candidateId);
    } catch (e) {
      const detail = e instanceof ApiError ? e.detail : "Couldn't get a voice token.";
      setError(detail);
      setStatus("error");
      return;
    }
    if (!tokenRes.url || !tokenRes.token) {
      setError("Voice isn't configured on the server yet (LiveKit env vars missing).");
      setStatus("error");
      return;
    }

    setStatus("connecting");
    const room = new Room({ adaptiveStream: true, dynacast: true });
    roomRef.current = room;
    attachRoomListeners(room);

    try {
      await room.connect(tokenRes.url, tokenRes.token);
      await room.localParticipant.setMicrophoneEnabled(true);
      // Dispatch the AI agent into the room now that the candidate has joined.
      await api.voiceConnect(sessionId);
      setStatus("connected");
      startPolling();
    } catch (e) {
      const detail = e instanceof ApiError ? e.detail : "Couldn't connect the voice room.";
      setError(detail);
      setStatus("error");
    }
  }, [attachRoomListeners, candidateId, sessionId, startPolling]);

  const leaveRoom = useCallback(async () => {
    stopPolling();
    const room = roomRef.current;
    roomRef.current = null;
    if (room) {
      room.removeAllListeners();
      await room.disconnect();
    }
    if (audioElRef.current) {
      audioElRef.current.remove();
      audioElRef.current = null;
    }
    try {
      await api.voiceDisconnect(sessionId);
    } catch {
      /* best-effort */
    }
    setStatus("idle");
    setAiSpeaking(false);
  }, [sessionId, stopPolling]);

  const toggleMic = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !micMuted;
    await room.localParticipant.setMicrophoneEnabled(!next);
    setMicMuted(next);
  }, [micMuted]);

  useEffect(() => {
    return () => {
      stopPolling();
      const room = roomRef.current;
      if (room) {
        room.removeAllListeners();
        room.disconnect();
      }
      if (audioElRef.current) audioElRef.current.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, error, aiSpeaking, micMuted, connect: joinRoom, disconnect: leaveRoom, toggleMic };
}
