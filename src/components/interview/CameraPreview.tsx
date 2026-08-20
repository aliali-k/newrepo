"use client";

import { RefObject } from "react";
import { AlertTriangle, Camera, CameraOff, CheckCircle2 } from "lucide-react";
import { Button, Spinner } from "@/components/ui";
import { CameraStatus } from "./useCameraAntiCheat";

export function CameraPreview({
  videoRef,
  cameraStatus,
  size = "sm",
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  cameraStatus: CameraStatus;
  size?: "sm" | "lg";
}) {
  const dims = size === "lg" ? "w-full aspect-video" : "w-32 h-24";
  return (
    <div className={`relative ${dims} rounded-[var(--radius-md)] overflow-hidden border border-[var(--border)] bg-black/80 shrink-0`}>
      <video ref={videoRef} muted playsInline className="w-full h-full object-cover -scale-x-100" />
      {cameraStatus !== "active" && (
        <div className="absolute inset-0 flex items-center justify-center text-[var(--text-faint)]">
          {cameraStatus === "requesting" ? (
            <Spinner className="w-4 h-4" />
          ) : cameraStatus === "denied" ? (
            <CameraOff size={16} />
          ) : (
            <Camera size={16} />
          )}
        </div>
      )}
    </div>
  );
}

export function BaselineCaptureFlow({
  videoRef,
  cameraStatus,
  capturing,
  progressPct,
  ready,
  onStart,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  cameraStatus: CameraStatus;
  capturing: boolean;
  progressPct: number;
  ready: boolean;
  onStart: () => void;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] p-4">
      <div className="flex items-center gap-2 mb-3">
        {ready ? <CheckCircle2 size={16} className="text-[var(--good)]" /> : <Camera size={16} className="text-[var(--text-muted)]" />}
        <span className="text-sm font-medium">Identity baseline capture</span>
      </div>
      <p className="text-xs text-[var(--text-faint)] mb-3 leading-relaxed">
        We'll look at your face for 30 seconds before the interview starts. This reference is used only to confirm it's
        still you throughout the session — it's stored as a compact numeric descriptor, not a photo.
      </p>

      <div className="flex items-center gap-3">
        <CameraPreview videoRef={videoRef} cameraStatus={cameraStatus} />
        <div className="flex-1">
          {ready ? (
            <span className="text-xs text-[var(--good)]">Baseline captured — you're set.</span>
          ) : capturing ? (
            <div>
              <div className="h-1.5 rounded-full bg-[var(--surface-3)] overflow-hidden mb-1.5">
                <div
                  className="h-full bg-[var(--accent)] transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-xs text-[var(--text-faint)]">Hold still, looking at the camera… {progressPct}%</span>
            </div>
          ) : (
            <Button variant="secondary" onClick={onStart} type="button" className="text-xs">
              {cameraStatus === "denied" ? "Camera access denied — retry" : "Start 30s capture"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

const FLAG_LABELS: Record<string, string> = {
  noFace: "No face in frame",
  multipleFaces: "Multiple faces",
  gazeAway: "Looking away",
  phoneVisible: "Phone visible",
  extraPerson: "Extra person",
  faceMismatch: "Face mismatch",
};

export function LiveIntegrityBadges({ liveFlags }: { liveFlags: Record<string, boolean> }) {
  const active = Object.entries(liveFlags).filter(([, v]) => v);
  if (active.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {active.map(([k]) => (
        <span
          key={k}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--caution-soft)] text-[var(--caution)]"
        >
          <AlertTriangle size={10} />
          {FLAG_LABELS[k] || k}
        </span>
      ))}
    </div>
  );
}
