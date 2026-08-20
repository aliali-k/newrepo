"use client";

// Wires the backend's second-voice-detection endpoint
// (POST /api/anticheat/analyze-audio, pyannote diarization) which existed
// but no component was calling it yet. This hook grabs its own short mic
// segments (independent of the LiveKit voice pipeline) every SEGMENT_MS,
// uploads each one, and lets it go — the backend deletes the audio file
// immediately after diarization (Section 17: no permanent audio storage),
// only the resulting flag (if any) is kept on the session.

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

const SEGMENT_MS = 20_000; // ~20s rolling segments

export type AudioAntiCheatStatus = "idle" | "listening" | "denied" | "unsupported";

function pickMimeType(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg"];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}

export function useAudioAntiCheat(sessionId: string | null, active: boolean) {
  const [status, setStatus] = useState<AudioAntiCheatStatus>("idle");
  const [secondVoiceDetected, setSecondVoiceDetected] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const stoppedRef = useRef(false);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {
        /* already stopped */
      }
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStatus("idle");
  }, []);

  useEffect(() => {
    if (!active || !sessionId) return;
    stoppedRef.current = false;

    (async () => {
      if (typeof MediaRecorder === "undefined") {
        setStatus("unsupported");
        return;
      }
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        setStatus("denied");
        return;
      }
      if (stoppedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      setStatus("listening");

      const mimeType = pickMimeType();

      const recordOneSegment = () => {
        if (stoppedRef.current || !streamRef.current) return;
        let recorder: MediaRecorder;
        try {
          recorder = mimeType ? new MediaRecorder(streamRef.current, { mimeType }) : new MediaRecorder(streamRef.current);
        } catch {
          setStatus("unsupported");
          return;
        }
        const parts: Blob[] = [];
        recorder.ondataavailable = (e: BlobEvent) => {
          if (e.data && e.data.size > 0) parts.push(e.data);
        };
        recorder.onstop = async () => {
          if (parts.length && sessionId) {
            const blob = new Blob(parts, { type: mimeType || "audio/webm" });
            const result = await api.analyzeAudio(sessionId, blob, "segment.webm");
            if (result?.second_voice_detected) setSecondVoiceDetected(true);
          }
          if (!stoppedRef.current) recordOneSegment();
        };
        recorderRef.current = recorder;
        recorder.start();
        setTimeout(() => {
          if (recorder.state !== "inactive") recorder.stop();
        }, SEGMENT_MS);
      };

      recordOneSegment();
    })();

    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, sessionId]);

  return { status, secondVoiceDetected, stop };
}
