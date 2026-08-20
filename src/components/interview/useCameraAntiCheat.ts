"use client";

// Camera-based anti-cheat layer (Master Build Doc §18 + gap-analysis #2/#5):
//   1. Baseline face capture (~30s enrollment, before the interview starts)
//   2. Continuous face-match against that baseline (impersonation check)
//   3. Gaze tracking (off-screen glance detection)
//   4. Mobile-phone / multiple-people-in-frame detection (YOLO, sampled less
//      often since it's the heaviest model)
//
// Everything runs on-device (WASM). No video frame is ever uploaded — only
// short event strings ("gaze_away", "phone_detected", ...) are sent to the
// backend via api.reportEvent, same shape as the existing tab-switch/blur
// detectors in useAntiCheat.ts. Detection is debounced (a condition must
// hold for several consecutive samples) before it's reported, so a single
// blink or head turn never fires a flag — matches the "detection + human
// review, never automatic punishment" philosophy from the build docs.

import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { analyzeVideoFrame, cosineSimilarity, disposeFaceLandmarker } from "@/lib/faceMonitor";
import { analyzeVideoFrameForObjects } from "@/lib/objectMonitor";

const GAZE_YAW_THRESHOLD_DEG = 28;
const FACE_MATCH_THRESHOLD = 0.90;
const SUSTAIN_TICKS_FACE = 4; // ~4s at 1s/tick before flagging
const FACE_TICK_MS = 1000;
const OBJECT_TICK_MS = 4000;
const BASELINE_DURATION_MS = 30_000;
const BASELINE_SAMPLE_MS = 500;

export type CameraStatus = "idle" | "requesting" | "active" | "denied" | "error";

export interface CameraAntiCheatState {
  cameraStatus: CameraStatus;
  baselineCapturing: boolean;
  baselineProgressPct: number;
  baselineReady: boolean;
  liveFlags: {
    noFace: boolean;
    multipleFaces: boolean;
    gazeAway: boolean;
    phoneVisible: boolean;
    extraPerson: boolean;
    faceMismatch: boolean;
  };
}

function baselineKey(sessionId: string) {
  return `jee_face_baseline_${sessionId}`;
}

export function useCameraAntiCheat(sessionId: string | null, videoRef: RefObject<HTMLVideoElement | null>, active: boolean) {
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle");
  const [baselineCapturing, setBaselineCapturing] = useState(false);
  const [baselineProgressPct, setBaselineProgressPct] = useState(0);
  const [baselineReady, setBaselineReady] = useState(false);
  const [liveFlags, setLiveFlags] = useState<CameraAntiCheatState["liveFlags"]>({
    noFace: false,
    multipleFaces: false,
    gazeAway: false,
    phoneVisible: false,
    extraPerson: false,
    faceMismatch: false,
  });

  const streamRef = useRef<MediaStream | null>(null);
  const baselineDescriptorRef = useRef<number[] | null>(null);
  const sustainCounters = useRef({ noFace: 0, multipleFaces: 0, gazeAway: 0, faceMismatch: 0 });
  const reportedOnce = useRef({ noFace: false, multipleFaces: false, gazeAway: false, faceMismatch: false, phone: false, extraPerson: false });
  const faceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const objectIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCamera = useCallback(async () => {
    if (streamRef.current) return streamRef.current;
    setCameraStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraStatus("active");
      return stream;
    } catch (e) {
      setCameraStatus("denied");
      if (sessionId) api.reportEvent(sessionId, "camera_permission_denied", String(e));
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraStatus("idle");
  }, []);

  // Load any previously-captured baseline for this session (e.g. candidate
  // completed enrollment on /consent, then navigated to /interview/[id]).
  useEffect(() => {
    if (!sessionId || typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem(baselineKey(sessionId));
    if (raw) {
      try {
        baselineDescriptorRef.current = JSON.parse(raw);
        setBaselineReady(true);
      } catch {
        /* ignore corrupt entry */
      }
    }
  }, [sessionId]);

  const captureBaseline = useCallback(async () => {
    if (!sessionId) return;
    const stream = await startCamera();
    if (!stream || !videoRef.current) return;

    setBaselineCapturing(true);
    setBaselineProgressPct(0);
    const samples: number[][] = [];
    const startedAt = Date.now();

    return new Promise<boolean>((resolve) => {
      const tick = async () => {
        const elapsed = Date.now() - startedAt;
        setBaselineProgressPct(Math.min(100, Math.round((elapsed / BASELINE_DURATION_MS) * 100)));
        if (videoRef.current) {
          try {
            const result = await analyzeVideoFrame(videoRef.current, performance.now());
            if (result.faceCount === 1 && result.descriptor?.length) {
              samples.push(result.descriptor);
            }
          } catch {
            /* a missed frame is fine, we take many samples */
          }
        }
        if (elapsed >= BASELINE_DURATION_MS) {
          if (samples.length >= 5) {
            const dim = samples[0].length;
            const avg = new Array(dim).fill(0);
            for (const s of samples) for (let i = 0; i < dim; i++) avg[i] += s[i] / samples.length;
            baselineDescriptorRef.current = avg;
            window.sessionStorage.setItem(baselineKey(sessionId), JSON.stringify(avg));
            setBaselineReady(true);
            api.reportEvent(sessionId, "baseline_face_captured", `${samples.length} samples`);
            resolve(true);
          } else {
            resolve(false);
          }
          setBaselineCapturing(false);
          setBaselineProgressPct(100);
        } else {
          setTimeout(tick, BASELINE_SAMPLE_MS);
        }
      };
      tick();
    });
  }, [sessionId, startCamera, videoRef]);

  const reportOnceDebounced = useCallback(
    (key: keyof typeof reportedOnce.current, eventType: string, detail: string) => {
      if (!sessionId) return;
      if (reportedOnce.current[key]) return;
      reportedOnce.current[key] = true;
      api.reportEvent(sessionId, eventType, detail);
      // allow re-reporting after a cool-down so a persistent problem isn't
      // reported only once for the whole 45-minute interview
      setTimeout(() => {
        reportedOnce.current[key] = false;
      }, 30_000);
    },
    [sessionId]
  );

  useEffect(() => {
    if (!active || !sessionId || baselineCapturing) return;
    let cancelled = false;

    (async () => {
      const stream = await startCamera();
      if (!stream || cancelled) return;

      faceIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        let result;
        try {
          result = await analyzeVideoFrame(videoRef.current, performance.now());
        } catch {
          return;
        }
        const c = sustainCounters.current;

        c.noFace = result.faceCount === 0 ? c.noFace + 1 : 0;
        c.multipleFaces = result.faceCount > 1 ? c.multipleFaces + 1 : 0;
        c.gazeAway = result.faceCount === 1 && Math.abs(result.yawDeg ?? 0) > GAZE_YAW_THRESHOLD_DEG ? c.gazeAway + 1 : 0;

        let mismatch = false;
        if (result.faceCount === 1 && baselineDescriptorRef.current && result.descriptor?.length) {
          const sim = cosineSimilarity(baselineDescriptorRef.current, result.descriptor);
          mismatch = sim < FACE_MATCH_THRESHOLD;
        }
        c.faceMismatch = mismatch ? c.faceMismatch + 1 : 0;

        setLiveFlags({
          noFace: c.noFace >= SUSTAIN_TICKS_FACE,
          multipleFaces: c.multipleFaces >= SUSTAIN_TICKS_FACE,
          gazeAway: c.gazeAway >= SUSTAIN_TICKS_FACE,
          faceMismatch: c.faceMismatch >= SUSTAIN_TICKS_FACE,
          phoneVisible: liveFlags.phoneVisible,
          extraPerson: liveFlags.extraPerson,
        });

        if (c.noFace >= SUSTAIN_TICKS_FACE) reportOnceDebounced("noFace", "no_face_detected", "no face in frame for several seconds");
        if (c.multipleFaces >= SUSTAIN_TICKS_FACE) reportOnceDebounced("multipleFaces", "multiple_people_detected", "multiple faces detected");
        if (c.gazeAway >= SUSTAIN_TICKS_FACE) reportOnceDebounced("gazeAway", "gaze_away", `yaw=${(result.yawDeg ?? 0).toFixed(1)}deg`);
        if (c.faceMismatch >= SUSTAIN_TICKS_FACE) reportOnceDebounced("faceMismatch", "face_mismatch", "current face doesn't match baseline enrollment");
      }, FACE_TICK_MS);

      objectIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        const result = await analyzeVideoFrameForObjects(videoRef.current);
        if (!result) return; // model not available — fail open, no flag

        setLiveFlags((prev) => ({ ...prev, phoneVisible: result.phoneDetected, extraPerson: result.personCount > 1 }));

        if (result.phoneDetected) reportOnceDebounced("phone", "phone_detected", "phone-like object visible in frame");
        if (result.personCount > 1) reportOnceDebounced("extraPerson", "multiple_people_detected", `${result.personCount} people visible`);
      }, OBJECT_TICK_MS);
    })();

    return () => {
      cancelled = true;
      if (faceIntervalRef.current) clearInterval(faceIntervalRef.current);
      if (objectIntervalRef.current) clearInterval(objectIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, sessionId, startCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
      disposeFaceLandmarker();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStream = useCallback(() => streamRef.current, []);

  return {
    cameraStatus,
    baselineCapturing,
    baselineProgressPct,
    baselineReady,
    liveFlags,
    startCamera,
    stopCamera,
    captureBaseline,
    // Lets useVideoRecorder attach to the same live camera stream instead of
    // requesting getUserMedia a second time.
    getStream,
  };
}
