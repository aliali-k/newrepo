"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shell, Card, Badge, Spinner, ErrorNote } from "@/components/ui";
import { api, ApiError, FinalEvaluation } from "@/lib/api";
import { local } from "@/lib/local";

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="mb-4">
      <div className="flex justify-between text-sm mb-1.5">
        <span className="text-[var(--text-secondary)]">{label}</span>
        <span className="font-medium text-[var(--text)]">{Math.round(value)}%</span>
      </div>
      <div className="h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] transition-all"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

function CompletedInner() {
  const params = useSearchParams();
  const sessionId = params.get("session") || local.sessionId || "";
  const [evaluation, setEvaluation] = useState<FinalEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }
    api
      .getSession(sessionId)
      .then((s) => setEvaluation(s.final_evaluation || null))
      .catch((e) => setError(e instanceof ApiError ? e.detail : "Couldn't load your results."))
      .finally(() => setLoading(false));
  }, [sessionId]);

  return (
    <Shell narrow>
      <div className="text-center mb-10">
        <div className="w-14 h-14 rounded-2xl bg-[var(--accent-soft)] border border-[var(--accent)]/20 mx-auto mb-5 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full bg-[var(--accent)]" />
        </div>
        <h1 className="text-3xl mb-2 font-[family-name:var(--font-display)] font-semibold">That&apos;s a wrap</h1>
        <p className="text-[var(--text-secondary)] text-sm">
          Thank you for taking the time. A JEEINDIA reviewer will make the final call and email you either way.
        </p>
      </div>

      {loading && (
        <div className="flex justify-center py-10">
          <Spinner className="w-6 h-6" />
        </div>
      )}

      <ErrorNote>{error}</ErrorNote>

      {!loading && evaluation && (
        <Card className="animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-xs text-[var(--text-tertiary)] mb-1 font-mono-data uppercase tracking-wide">Overall</div>
              <div className="text-4xl font-[family-name:var(--font-display)] font-semibold">
                {Math.round(evaluation.weighted_overall_score)}
                <span className="text-lg text-[var(--text-tertiary)]">/100</span>
              </div>
            </div>
            <Badge tone={evaluation.borderline ? "caution" : "good"}>{evaluation.level_bucket}</Badge>
          </div>

          <ScoreBar label="Engineering depth" value={evaluation.engineering_depth_pct} />
          <ScoreBar label="Mentoring quality" value={evaluation.mentoring_quality_pct} />
          <ScoreBar label="Resume authenticity" value={evaluation.resume_authenticity_pct} />

          {evaluation.strong_topics?.length > 0 && (
            <div className="mt-6 pt-5 border-t border-[var(--border)]">
              <div className="text-xs text-[var(--text-tertiary)] mb-2 font-mono-data uppercase tracking-wide">Strong topics</div>
              <div className="flex flex-wrap gap-2">
                {evaluation.strong_topics.map((t) => (
                  <Badge key={t} tone="good">{t}</Badge>
                ))}
              </div>
            </div>
          )}

          {evaluation.reasoning_summary && (
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-5 pt-5 border-t border-[var(--border)]">
              {evaluation.reasoning_summary}
            </p>
          )}
        </Card>
      )}

      {!loading && !evaluation && !error && (
        <p className="text-center text-sm text-[var(--text-tertiary)]">No results found for this session yet.</p>
      )}

      <div className="text-center mt-8">
        <Link href="/" className="text-sm text-[var(--accent-text)] hover:underline">
          Back to home
        </Link>
      </div>
    </Shell>
  );
}

export default function CompletedPage() {
  return (
    <Suspense fallback={null}>
      <CompletedInner />
    </Suspense>
  );
}
