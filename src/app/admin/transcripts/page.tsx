"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shell, Card, ErrorNote, Spinner } from "@/components/ui";
import { api, ApiError, TranscriptEvent } from "@/lib/api";
import { local } from "@/lib/local";

export default function TranscriptsPage() {
  const [data, setData] = useState<{ session_id: string; events: TranscriptEvent[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const adminKey = local.adminKey || "";

  useEffect(() => {
    if (!adminKey) {
      setLoading(false);
      return;
    }
    api
      .adminTranscripts(adminKey)
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.detail : "Couldn't load transcripts."))
      .finally(() => setLoading(false));
  }, [adminKey]);

  if (!adminKey) {
    return (
      <Shell narrow>
        <p className="text-sm text-[var(--text-secondary)]">
          Please <Link href="/admin" className="text-[var(--accent-text)] underline">sign in</Link> first.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <Link href="/admin" className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors">
        ← All candidates
      </Link>
      <h1 className="text-3xl mt-3 mb-8 font-[family-name:var(--font-display)] font-semibold">All transcripts</h1>
      <ErrorNote>{error}</ErrorNote>
      {loading && (
        <div className="flex justify-center py-16">
          <Spinner className="w-6 h-6" />
        </div>
      )}
      <div className="space-y-4 stagger">
        {data.map((d) => (
          <Card key={d.session_id}>
            <Link
              href={`/admin/candidate/${d.session_id}`}
              className="text-sm font-medium text-[var(--accent-text)] hover:underline"
            >
              {d.session_id}
            </Link>
            <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto pr-2">
              {d.events.slice(0, 8).map((e, i) => (
                <div key={i} className="text-xs text-[var(--text-secondary)]">
                  <span className="text-[var(--text-tertiary)] mr-1.5">{e.speaker}:</span>
                  {e.text.slice(0, 140)}
                </div>
              ))}
              {d.events.length > 8 && (
                <div className="text-xs text-[var(--text-tertiary)]">+{d.events.length - 8} more…</div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </Shell>
  );
}
