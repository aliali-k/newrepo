"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, ErrorNote, Spinner } from "@/components/ui";
import { CandidateFlowShell } from "@/components/CandidateFlow";
import { api, ApiError } from "@/lib/api";
import { local, uuid } from "@/lib/local";
import { useCameraAntiCheat } from "@/components/interview/useCameraAntiCheat";
import { BaselineCaptureFlow } from "@/components/interview/CameraPreview";
import clsx from "clsx";

const POINTS = [
  "This session is recorded (audio/video) for scoring purposes.",
  "An AI conducts and evaluates the interview; a human makes the final decision.",
  "If you're rejected, your recording is deleted right after scoring — only the score and reasoning are kept.",
  "If selected, your recording is kept for about a day as a dispute safety-net, then deleted.",
  "A short camera check runs during the interview (face-match, gaze, phone/second-person detection) purely for integrity — flags go to human review, never an automatic rejection.",
];

function ConsentToggle({
  title,
  body,
  checked,
  onChange,
}: {
  title: string;
  body: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={clsx(
        "w-full text-left rounded-[var(--radius-lg)] border p-4 flex items-start gap-4 transition-all",
        checked ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-hover)]"
      )}
    >
      <span
        className={clsx(
          "mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
          checked ? "border-[var(--accent)] bg-[var(--accent)]" : "border-[var(--border-hover)]"
        )}
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-white" fill="none">
            <path d="M2 6l2.5 2.5L10 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span>
        <span className="block text-sm font-medium text-[var(--text)] mb-0.5">{title}</span>
        <span className="block text-xs text-[var(--text-secondary)] leading-relaxed">{body}</span>
      </span>
    </button>
  );
}

export default function ConsentPage() {
  const router = useRouter();
  const [recording, setRecording] = useState(false);
  const [evaluation, setEvaluation] = useState(false);
  const [cameraConsent, setCameraConsent] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const tempIdRef = useRef<string>(uuid());
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const { cameraStatus, baselineCapturing, baselineProgressPct, baselineReady, captureBaseline } = useCameraAntiCheat(
    cameraConsent ? tempIdRef.current : null,
    cameraVideoRef,
    false
  );

  const ready = recording && evaluation && cameraConsent && baselineReady;

  async function handleStart() {
    if (!ready) return;
    setStarting(true);
    setError("");
    try {
      const candidateId = local.candidateId;
      if (!candidateId) {
        router.push("/apply");
        return;
      }
      const res = await api.startInterview({
        candidate_id: candidateId,
        invite_id: local.inviteId || undefined,
        profile_id: local.profileId || undefined,
        languages: ["English"],
        subjects: local.subjects,
      });
      if (typeof window !== "undefined") {
        const raw = window.sessionStorage.getItem(`jee_face_baseline_${tempIdRef.current}`);
        if (raw) window.sessionStorage.setItem(`jee_face_baseline_${res.session_id}`, raw);
      }
      local.sessionId = res.session_id;
      router.push(`/interview/${res.session_id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Couldn't start the interview.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <CandidateFlowShell step="consent">
      <h1 className="text-3xl mb-2 font-[family-name:var(--font-display)] font-semibold">Before we begin</h1>
      <p className="text-[var(--text-secondary)] mb-8 text-sm">
        A quick, honest heads-up about how this works.
      </p>

      <Card className="mb-5">
        <ul className="space-y-3">
          {POINTS.map((p) => (
            <li key={p} className="flex gap-3 text-sm text-[var(--text-secondary)] leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-1.5 shrink-0" />
              {p}
            </li>
          ))}
        </ul>
      </Card>

      <div className="space-y-3 mb-5">
        <ConsentToggle
          title="Recording"
          body="I consent to being recorded during this interview."
          checked={recording}
          onChange={setRecording}
        />
        <ConsentToggle
          title="AI evaluation"
          body="I consent to being evaluated by an AI interviewer, with a human making the final call."
          checked={evaluation}
          onChange={setEvaluation}
        />
        <ConsentToggle
          title="Camera integrity check"
          body="I consent to camera-based integrity checks (face-match, gaze, phone/second-person detection) during the interview."
          checked={cameraConsent}
          onChange={setCameraConsent}
        />
      </div>

      {cameraConsent && (
        <Card className="mb-5">
          <div className="text-xs text-[var(--text-tertiary)] mb-3 font-mono-data uppercase tracking-wide">Baseline camera checkpoint</div>
          <BaselineCaptureFlow
            videoRef={cameraVideoRef}
            cameraStatus={cameraStatus}
            capturing={baselineCapturing}
            progressPct={baselineProgressPct}
            ready={baselineReady}
            onStart={captureBaseline}
          />
        </Card>
      )}

      <ErrorNote>{error}</ErrorNote>

      <Button onClick={handleStart} disabled={!ready || starting} className="w-full">
        {starting ? <Spinner /> : "Start the interview"}
      </Button>
    </CandidateFlowShell>
  );
}
