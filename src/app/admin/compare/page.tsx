"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shell, Card, Button, Badge, ErrorNote, Spinner } from "@/components/ui";
import { api, ApiError, SessionState } from "@/lib/api";
import { local } from "@/lib/local";

const METRICS: { key: keyof NonNullable<SessionState["final_evaluation"]>; label: string }[] = [
  { key: "weighted_overall_score", label: "Overall score" },
  { key: "engineering_depth_pct", label: "Engineering depth" },
  { key: "mentoring_quality_pct", label: "Mentoring quality" },
  { key: "resume_authenticity_pct", label: "Resume authenticity" },
];

export default function ComparePage() {
  const [adminKey, setAdminKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [candidates, setCandidates] = useState<SessionState[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    const saved = local.adminKey;
    if (saved) {
      setAdminKey(saved);
      load(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(key: string) {
    setLoading(true);
    setError("");
    try {
      const res = await api.adminCandidates(key);
      setCandidates(res.filter((c) => c.final_evaluation));
      setAuthed(true);
      local.adminKey = key;
    } catch (e) {
      setError(e instanceof ApiError && e.status === 401 ? "Incorrect admin key." : "Couldn't reach the admin API.");
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  }

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  }

  const chosen = candidates.filter((c) => selected.includes(c.session_id));

  if (!authed) {
    return (
      <Shell narrow>
        <h1 className="text-3xl mb-2 font-[family-name:var(--font-display)] font-semibold">Compare candidates</h1>
        <Card>
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(adminKey)}
            placeholder="Admin key"
            autoFocus
            className="w-full text-sm rounded-[var(--radius-md)] bg-[var(--surface-2)] border border-[var(--border)] px-3.5 py-2.5 text-[var(--text)] placeholder:text-[var(--text-quaternary)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 mb-4"
          />
          <ErrorNote>{error}</ErrorNote>
          <Button className="w-full" onClick={() => load(adminKey)} disabled={loading}>
            {loading ? <Spinner /> : "Enter"}
          </Button>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl mb-1 font-[family-name:var(--font-display)] font-semibold">Compare candidates</h1>
          <p className="text-[var(--text-secondary)] text-sm">Pick up to 4 completed candidates to compare side by side.</p>
        </div>
        <Link href="/admin">
          <Button variant="secondary">← Back</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {candidates.map((c) => (
          <button
            key={c.session_id}
            onClick={() => toggle(c.session_id)}
            className={`text-xs px-3 py-1.5 rounded-md border transition-all ${
              selected.includes(c.session_id)
                ? "bg-[var(--accent-soft)] text-[var(--accent-text)] border-[var(--accent)]/30"
                : "text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--border-hover)] hover:text-[var(--text)]"
            }`}
          >
            {c.candidate_id} · {Math.round(c.final_evaluation?.weighted_overall_score || 0)}
          </button>
        ))}
        {candidates.length === 0 && !loading && (
          <p className="text-sm text-[var(--text-tertiary)]">No completed/scored candidates yet.</p>
        )}
      </div>

      {chosen.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left text-xs text-[var(--text-tertiary)] font-normal pb-3 pr-4">Metric</th>
                  {chosen.map((c) => (
                    <th key={c.session_id} className="text-left text-xs font-medium pb-3 pr-4 text-[var(--text)]">
                      <Link href={`/admin/candidate/${c.session_id}`} className="hover:text-[var(--accent-text)] transition-colors">
                        {c.candidate_id}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {METRICS.map((m) => (
                  <tr key={m.key} className="border-t border-[var(--border)]">
                    <td className="py-2.5 pr-4 text-[var(--text-secondary)]">{m.label}</td>
                    {chosen.map((c) => (
                      <td key={c.session_id} className="py-2.5 pr-4 text-[var(--text)]">
                        {Math.round(Number(c.final_evaluation?.[m.key] ?? 0))}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t border-[var(--border)]">
                  <td className="py-2.5 pr-4 text-[var(--text-secondary)]">Level</td>
                  {chosen.map((c) => (
                    <td key={c.session_id} className="py-2.5 pr-4">
                      <Badge tone="accent">{c.final_evaluation?.level_bucket}</Badge>
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-[var(--border)]">
                  <td className="py-2.5 pr-4 text-[var(--text-secondary)]">Integrity</td>
                  {chosen.map((c) => (
                    <td key={c.session_id} className="py-2.5 pr-4">
                      <Badge tone={c.integrity_status === "clean" ? "good" : "caution"}>{c.integrity_status}</Badge>
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-[var(--border)]">
                  <td className="py-2.5 pr-4 text-[var(--text-secondary)] align-top">Weak topics</td>
                  {chosen.map((c) => (
                    <td key={c.session_id} className="py-2.5 pr-4 align-top text-xs text-[var(--text-tertiary)]">
                      {c.final_evaluation?.weak_topics?.join(", ") || "—"}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </Shell>
  );
}
