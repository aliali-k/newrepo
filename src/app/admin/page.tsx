"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Shell, Card, Field, Input, Button, Badge, ErrorNote, Spinner } from "@/components/ui";
import { api, ApiError, SessionState } from "@/lib/api";
import { local } from "@/lib/local";
import { CandidateDetailPanel } from "@/components/admin/CandidateDetailPanel";

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [candidates, setCandidates] = useState<SessionState[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const saved = local.adminKey;
    if (saved) {
      setAdminKey(saved);
      handleLogin(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin(key: string) {
    setLoading(true);
    setError("");
    try {
      const res = await api.adminCandidates(key);
      setCandidates(res);
      setAuthed(true);
      local.adminKey = key;
    } catch (e) {
      setError(e instanceof ApiError && e.status === 401 ? "Incorrect admin key." : "Couldn't reach the admin API.");
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (!query.trim()) return candidates;
    const q = query.toLowerCase();
    return candidates.filter(
      (c) => c.candidate_id.toLowerCase().includes(q) || c.subjects?.some((s) => s.toLowerCase().includes(q))
    );
  }, [candidates, query]);

  if (!authed) {
    return (
      <Shell narrow>
        <h1 className="text-3xl mb-2">Admin</h1>
        <p className="text-[var(--ink-soft)] mb-8 text-sm">
          Matches the <code className="text-[var(--signal-text)]">ADMIN_KEY</code> in the backend&apos;s .env.
        </p>
        <Card>
          <Field label="Admin key">
            <Input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin(adminKey)}
              autoFocus
            />
          </Field>
          <ErrorNote>{error}</ErrorNote>
          <Button className="w-full" onClick={() => handleLogin(adminKey)} disabled={loading}>
            {loading ? <Spinner /> : "Enter"}
          </Button>
        </Card>
      </Shell>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-[var(--line-soft)] hidden lg:flex flex-col px-4 py-6 gap-1">
        <Link href="/" className="flex items-center gap-2 px-2 mb-6">
          <div className="w-6 h-6 rounded-[6px] bg-[var(--navy)] flex items-center justify-center">
            <div className="w-2 h-2 rounded-[2px] bg-[var(--signal)]" />
          </div>
          <span className="font-[family-name:var(--font-display)] text-sm font-medium">JEEINDIA</span>
        </Link>
        <span className="px-2 text-[10px] text-[var(--ink-faint)] font-mono-data uppercase tracking-wider mb-1">Workspace</span>
        <div className="px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--paper-sunk)] text-sm text-[var(--ink)] font-medium">Candidates</div>
        <Link href="/admin/compare" className="px-3 py-2 rounded-[var(--radius-sm)] text-sm text-[var(--ink-soft)] hover:bg-[var(--paper-sunk)] transition-colors">Compare</Link>
        <Link href="/admin/transcripts" className="px-3 py-2 rounded-[var(--radius-sm)] text-sm text-[var(--ink-soft)] hover:bg-[var(--paper-sunk)] transition-colors">Transcripts</Link>
        <Link href="/admin/rag-upload" className="px-3 py-2 rounded-[var(--radius-sm)] text-sm text-[var(--ink-soft)] hover:bg-[var(--paper-sunk)] transition-colors">RAG upload</Link>
      </aside>

      <div className="flex-1 min-w-0">
        {/* Top bar */}
        <div className="border-b border-[var(--line-soft)] px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl text-[var(--ink)]">Candidates</h1>
            <p className="text-xs text-[var(--ink-faint)]">Borderline and integrity-flagged candidates surface first.</p>
          </div>
          <Input
            placeholder="Search candidates or subjects…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-xs"
          />
        </div>

        {/* Table */}
        <div className="px-6 py-4">
          {filtered.length === 0 && (
            <p className="text-sm text-[var(--ink-faint)] py-8 text-center">No interview sessions match.</p>
          )}

          {filtered.length > 0 && (
            <div className="rounded-[var(--radius-md)] border border-[var(--line)] overflow-hidden">
              <div className="grid grid-cols-[1.6fr_1.4fr_0.8fr_0.8fr_0.6fr] gap-3 px-4 py-2.5 bg-[var(--paper-sunk)] text-[10px] font-mono-data uppercase tracking-wide text-[var(--ink-faint)]">
                <span>Candidate</span>
                <span>Subjects</span>
                <span>Integrity</span>
                <span>Status</span>
                <span className="text-right">Score</span>
              </div>
              {filtered.map((c) => (
                <button
                  key={c.session_id}
                  onClick={() => setSelectedId(c.session_id)}
                  className="w-full grid grid-cols-[1.6fr_1.4fr_0.8fr_0.8fr_0.6fr] gap-3 px-4 py-3 items-center text-left border-t border-[var(--line-soft)] hover:bg-[var(--paper-raised)] transition-colors"
                >
                  <span className="text-sm font-medium text-[var(--ink)] truncate">{c.candidate_id}</span>
                  <span className="flex gap-1 flex-wrap min-w-0">
                    {c.subjects?.slice(0, 2).map((s) => (
                      <Badge key={s}>{s}</Badge>
                    ))}
                  </span>
                  <span>{c.integrity_status !== "clean" ? <Badge tone="caution">{c.integrity_status}</Badge> : <span className="text-xs text-[var(--ink-faint)]">clean</span>}</span>
                  <span><Badge tone={c.status === "completed" ? "good" : "accent"}>{c.status}</Badge></span>
                  <span className="text-right text-sm text-[var(--ink)] font-mono-data">
                    {c.final_evaluation ? `${Math.round(c.final_evaluation.weighted_overall_score)}/100` : "—"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedId && <CandidateDetailPanel id={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
