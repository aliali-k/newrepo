"use client";

// Records the candidate's camera stream locally (MediaRecorder) and ships it
// to the backend in small chunks, purely for local disk storage on the
// candidate's own machine — see app/routers/anticheat.py's
// /video/chunk + /video/finalize. Nothing goes anywhere except this
// backend's DATA_DIR/videos/<session_id>/. After the interview ends,
// finalize() tells the server to run the offline YOLO/mediapipe
// post-process pass on the saved footage.
//
// Reuses the same MediaStream useCameraAntiCheat already opened (via
// getStream()) instead of requesting getUserMedia again.
//
// Whole-video guarantee: chunks upload continuously every CHUNK_TIMESLICE_MS
// the whole time recording is active — this does NOT wait for the interview
// to finish, so the backend already has everything recorded up to whatever
// moment the candidate is at. On top of that, this hook also listens for
// the tab closing / navigating away / the React component unmounting and
// fires a best-effort finalize in every one of those cases (via
// sendBeacon for real tab-close, since normal fetch() gets cancelled during
// unload) — so a candidate leaving mid-test still gets their partial
// recording finalized and post-processed, not just a clean "End interview".

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

const CHUNK_TIMESLICE_MS = 5_000; // ~5s per uploaded chunk — small window so an abrupt tab close loses at most a few seconds

export type VideoRecorderStatus = "idle" | "recording" | "finalizing" | "done" | "unsupported";

function pickMimeType(): string {
  const candidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}

export function useVideoRecorder(sessionId: string | null, getStream: () => MediaStream | null) {
  const [status, setStatus] = useState<VideoRecorderStatus>("idle");
  const [chunksUploaded, setChunksUploaded] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunkIndexRef = useRef(0);
  const startedRef = useRef(false);
  const finalizedRef = useRef(false); // guards against double-finalizing (clean end + unload firing both)
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  const start = useCallback(() => {
    if (!sessionId || startedRef.current) return;
    if (typeof MediaRecorder === "undefined") {
      setStatus("unsupported");
      return;
    }
    const stream = getStream();
    if (!stream) return;

    const mimeType = pickMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch {
      setStatus("unsupported");
      return;
    }

    recorder.ondataavailable = (e: BlobEvent) => {
      if (!e.data || e.data.size === 0) return;
      const idx = chunkIndexRef.current++;
      api.uploadVideoChunk(sessionId, idx, e.data).then((res) => {
        if (res) setChunksUploaded(res.total_chunks_received);
      });
    };

    recorder.start(CHUNK_TIMESLICE_MS);
    recorderRef.current = recorder;
    startedRef.current = true;
    setStatus("recording");
  }, [sessionId, getStream]);

  // Called once when the interview ends — flushes the last in-progress
  // chunk, then tells the backend recording is complete so it can kick off
  // the offline post-process pass.
  const finalize = useCallback(async () => {
    if (!sessionId || finalizedRef.current) return;
    finalizedRef.current = true;
    setStatus("finalizing");
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      await new Promise<void>((resolve) => {
        recorder.addEventListener("stop", () => resolve(), { once: true });
        recorder.requestData();
        recorder.stop();
      });
    }
    await api.finalizeVideo(sessionId, true);
    setStatus("done");
  }, [sessionId]);

  // Abrupt-leave safety net. beforeunload/pagehide cover the candidate
  // closing the tab, reloading, or navigating to a different site;
  // the effect cleanup (unmount) covers navigating to another in-app
  // route via the Next.js router, which doesn't fire a browser unload
  // event at all. Either way, whatever chunks already uploaded get
  // finalized + queued for post-processing — no explicit "End interview"
  // click required.
  useEffect(() => {
    function handleAbruptLeave() {
      if (finalizedRef.current) return;
      const recorder = recorderRef.current;
      // Best-effort flush of whatever's currently buffered in the recorder.
      // This is async and not guaranteed to land before the page is gone,
      // but costs nothing to try.
      if (recorder && recorder.state === "recording") {
        try {
          recorder.requestData();
        } catch {
          /* ignore */
        }
      }
      const sid = sessionIdRef.current;
      if (sid && api.finalizeVideoBeacon(sid)) {
        finalizedRef.current = true;
      }
    }

    window.addEventListener("pagehide", handleAbruptLeave);
    window.addEventListener("beforeunload", handleAbruptLeave);
    return () => {
      window.removeEventListener("pagehide", handleAbruptLeave);
      window.removeEventListener("beforeunload", handleAbruptLeave);
      // SPA route change away from the interview page — a normal fetch
      // still works here since the document itself isn't unloading.
      if (!finalizedRef.current && startedRef.current) {
        finalize().catch(() => null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, chunksUploaded, start, finalize };
}
