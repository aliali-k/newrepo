"use client";

import { useEffect, useState } from "react";
import { Card, Badge, Button, Textarea, ErrorNote, Spinner, StatusDot } from "@/components/ui";
import { api, ApiError, SessionState, FlaggedFrame, VideoStatus, flaggedFrameUrl, videoFullUrl } from "@/lib/api";
import { local } from "@/lib/local";
import clsx from "clsx";

const POSTPROCESS_TONE: Record<string, "neutral" | "accent" | "warm" | "good" | "caution"> = {
  not_started: "neutral",
  queued: "accent",
  running: "accent",
  done: "good",
  failed: "caution",
};

function ScoreCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--paper)] p-3">
      <div className="text-[10px] text-[var(--ink-faint)] font-mono-data uppercase tracking-wide mb-1">{label}</div>
      <div className="text-xl font-[family-name:var(--font-display)] text-[var(--ink)]">{Math.round(value)}%</div>
    </div>
  );
}

function TimelineDot({ tone }: { tone: "accent" | "good" | "caution" | "neutral" }) {
  const colors: Record<string, string> = {
    accent: "bg-[var(--signal)]",
    good: "bg-[var(--good)]",
    caution: "bg-[var(--caution)]",
    neutral: "bg-[var(--ink-faint)]",
  };
  return <span className={clsx("block w-2.5 h-2.5 rounded-full ring-4 ring-[var(--paper-raised)]", colors[tone])} />;
}

export function CandidateDetailPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const [session, setSession] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [videoStatus, setVideoStatus] = useState<VideoStatus | null>(null);
  const [flaggedFrames, setFlaggedFrames] = useState<FlaggedFrame[]>([]);
  const [postprocessTriggering, setPostprocessTriggering] = useState(false);

  const adminKey = local.adminKey || "";

  useEffect(() => {
    setLoading(true);
    setSession(null);
    setSubmitted(false);
    setNotes("");
    if (!adminKey) return;
    api
      .adminCandidate(id, adminKey)
      .then(setSession)
      .catch((e) => setError(e instanceof ApiError ? e.detail : "Couldn't load this candidate."))
      .finally(() => setLoading(false));
  }, [id, adminKey]);

  useEffect(() => {
    if (!adminKey) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const [status, frames] = await Promise.all([api.videoStatus(id), api.flaggedFrames(id)]);
        if (cancelled) return;
        setVideoStatus(status);
        setFlaggedFrames(frames.flagged_frames || []);
        if (status.video_post_process_status === "queued" || status.video_post_process_status === "running") {
          timer = setTimeout(poll, 4000);
        }
      } catch {
        /* no video yet */
      }
    }
    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id, adminKey]);

  async function retriggerPostprocess() {
    setPostprocessTriggering(true);
    try {
      await api.triggerPostprocess(id, adminKey);
      setVideoStatus(await api.videoStatus(id));
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Couldn't start post-processing.");
    } finally {
      setPostprocessTriggering(false);
    }
  }

  async function submitVerdict(decision: string) {
    setSubmitting(true);
    try {
      await api.adminVerdict(id, decision, notes, adminKey);
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Couldn't submit verdict.");
    } finally {
      setSubmitting(false);
    }
  }

  const evalData = session?.final_evaluation;

  // Build a simple timeline from transcript events + integrity/video flags.
  const timelineItems = [
    ...(session?.transcript_events || []).slice(-8).map((e, i) => ({
      key: `t${i}`,
      label: e.speaker === "ai" ? "AI asked a question" : e.speaker === "candidate" ? "Candidate responded" : "Event",
      detail: e.text,
      tone: "neutral" as const,
    })),
    ...flaggedFrames.slice(0, 6).map((f) => ({
      key: f.frame_id,
      label: f.event_type.replace(/_/g, " "),
      detail: `${Math.round(f.video_timestamp_seconds)}s into the recording`,
      tone: "caution" as const,
    })),
  ];

  return (
    <>
      <div className="fixed inset-0 bg-[var(--ink)]/25 z-40 animate-toast-in" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full sm:w-[560px] bg-[var(--paper)] border-l border-[var(--line)] z-50 overflow-y-auto shadow-[-12px_0_32px_rgba(22,33,44,0.14)]">
        <div className="sticky top-0 bg-[var(--paper)]/95 backdrop-blur border-b border-[var(--line-soft)] px-6 py-4 flex items-center justify-between z-10">
          <button onClick={onClose} className="text-xs text-[var(--ink-faint)] hover:text-[var(--ink)] font-mono-data">
            ← Close
          </button>
          {session && (
            <div className="flex gap-2">
              <Badge tone={session.status === "completed" ? "good" : "accent"}>{session.status}</Badge>
              {session.integrity_status !== "clean" && <Badge tone="caution">{session.integrity_status}</Badge>}
            </div>
          )}
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex justify-center py-16">
              <Spinner className="w-6 h-6" />
            </div>
          )}

          {!loading && !session && <ErrorNote>{error || "Candidate not found."}</ErrorNote>}

          {session && (
            <div className="space-y-5">
              <h1 className="text-2xl text-[var(--ink)]">{session.candidate_id}</h1>

              {evalData && (
                <div className="grid grid-cols-3 gap-2">
                  <ScoreCard label="Engineering" value={evalData.engineering_depth_pct} />
                  <ScoreCard label="Mentoring" value={evalData.mentoring_quality_pct} />
                  <ScoreCard label="Resume authenticity" value={evalData.resume_authenticity_pct} />
                </div>
              )}

              {evalData && (
                <Card>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs text-[var(--ink-faint)] font-mono-data uppercase tracking-wide">Overall score</div>
                    <Badge tone={evalData.borderline ? "caution" : "good"}>{evalData.level_bucket}</Badge>
                  </div>
                  <div className="text-3xl font-[family-name:var(--font-display)] text-[var(--ink)]">
                    {Math.round(evalData.weighted_overall_score)}/100
                  </div>
                  {evalData.weak_topics?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[var(--line-soft)]">
                      <div className="text-xs text-[var(--ink-faint)] mb-2">Weak topics</div>
                      <div className="flex flex-wrap gap-1.5">
                        {evalData.weak_topics.map((t) => (
                          <Badge key={t} tone="caution">{t}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              )}

              <Card>
                <div className="text-xs text-[var(--ink-faint)] mb-3 font-mono-data uppercase tracking-wide">Session</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--ink-soft)]">Phase</span>
                    <span className="text-[var(--ink)]">{session.phase}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--ink-soft)]">Tier</span>
                    <span className="text-[var(--ink)]">{session.candidate_tier}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[var(--ink-soft)] shrink-0">Formats used</span>
                    <span className="text-right text-[var(--ink)]">{session.used_formats?.join(", ") || "—"}</span>
                  </div>
                </div>
              </Card>

              {timelineItems.length > 0 && (
                <Card>
                  <div className="text-xs text-[var(--ink-faint)] mb-4 font-mono-data uppercase tracking-wide">Event timeline</div>
                  <div className="space-y-4">
                    {timelineItems.map((item) => (
                      <div key={item.key} className="flex gap-3">
                        <div className="flex flex-col items-center pt-1">
                          <TimelineDot tone={item.tone} />
                          <span className="flex-1 w-px bg-[var(--line)] mt-1" />
                        </div>
                        <div className="pb-1 min-w-0">
                          <div className="text-xs font-medium text-[var(--ink)] capitalize">{item.label}</div>
                          <div className="text-xs text-[var(--ink-faint)] truncate">{item.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {videoStatus && videoStatus.video_chunks_received > 0 && (
                <Card>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs text-[var(--ink-faint)] font-mono-data uppercase tracking-wide">Video verification</div>
                    <div className="flex items-center gap-2">
                      <Badge tone={POSTPROCESS_TONE[videoStatus.video_post_process_status] || "neutral"}>
                        {videoStatus.video_post_process_status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--ink-faint)] mb-3">
                    {videoStatus.video_chunks_received} chunk(s) saved on this machine.
                    {videoStatus.video_post_process_status === "done" &&
                      ` Verified offline — ${videoStatus.flagged_frame_count} flagged frame(s) found.`}
                    {videoStatus.video_post_process_status === "failed" && videoStatus.video_post_process_error && (
                      <span className="text-[var(--caution)]"> {videoStatus.video_post_process_error}</span>
                    )}
                  </p>
                  <Button
                    variant="secondary"
                    onClick={retriggerPostprocess}
                    disabled={postprocessTriggering || videoStatus.video_post_process_status === "running" || videoStatus.video_post_process_status === "queued"}
                    className="w-full mb-3"
                  >
                    {postprocessTriggering ? <Spinner /> : "Re-run post-process"}
                  </Button>
                  {videoStatus.video_full_path && (
                    <video src={videoFullUrl(videoStatus.video_full_path)} controls className="w-full rounded-[var(--radius-md)] border border-[var(--line)] mb-3" />
                  )}
                  {flaggedFrames.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {flaggedFrames.map((f) => (
                        <a
                          key={f.frame_id}
                          href={flaggedFrameUrl(f.image_path)}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded-[var(--radius-sm)] overflow-hidden border border-[var(--line)] hover:border-[var(--signal)] transition-colors"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={flaggedFrameUrl(f.image_path)} alt={f.event_type} className="w-full aspect-video object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </Card>
              )}

              <Card>
                <div className="text-xs text-[var(--ink-faint)] mb-3 font-mono-data uppercase tracking-wide">Verdict</div>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes for the record…" rows={3} className="mb-3" />
                <ErrorNote>{error}</ErrorNote>
                {submitted ? (
                  <Badge tone="good">Verdict recorded</Badge>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    <Button onClick={() => submitVerdict("selected")} disabled={submitting}>Select</Button>
                    <Button variant="secondary" onClick={() => submitVerdict("needs_review")} disabled={submitting}>Needs review</Button>
                    <Button variant="ghost" onClick={() => submitVerdict("rejected")} disabled={submitting}>Reject</Button>
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
