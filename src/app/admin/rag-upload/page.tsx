"use client";

// Section 8 / gap-analysis #7 — admin screen for POST /api/rag/upload-book.
// Previously that endpoint was fully built server-side but had to be hit
// via curl/Postman; this closes the loop so the "question pool grows as
// books are added" flywheel doesn't need a terminal.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shell, Card, Field, Input, Button, ErrorNote, Spinner, Badge } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { local } from "@/lib/local";

export default function RagUploadPage() {
  const [adminKey, setAdminKey] = useState("");
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [extractFigures, setExtractFigures] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ chunks_added: number; figures_added: number } | null>(null);

  useEffect(() => {
    setAdminKey(local.adminKey);
  }, []);

  async function handleUpload() {
    if (!file || !subject.trim() || !title.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await api.ragUploadBook(subject.trim(), title.trim(), file, extractFigures);
      setResult(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Upload failed — is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell narrow>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl">Upload reference book</h1>
        <Link href="/admin" className="text-xs text-[var(--text-faint)] hover:text-[var(--text-muted)]">
          ← Admin
        </Link>
      </div>
      <p className="text-[var(--text-muted)] mb-8 text-sm">
        Feeds Section 8&apos;s multimodal RAG pipeline — text is chunked and embedded, and (for PDFs) every
        qualifying figure/diagram is extracted, captioned, and made available to Format&nbsp;9
        (graph/plot interpretation).
      </p>
      <Card>
        <Field label="Subject">
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Electrical Engineering" />
        </Field>
        <Field label="Book / syllabus title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Signals & Systems — Oppenheim" />
        </Field>
        <Field label="File (PDF, DOCX, or TXT)">
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-xs text-[var(--text-muted)] file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:bg-[var(--accent-soft)] file:text-[var(--accent-text)]"
          />
        </Field>
        <label className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-4 cursor-pointer">
          <input type="checkbox" checked={extractFigures} onChange={(e) => setExtractFigures(e.target.checked)} />
          Extract & caption figures/diagrams (PDF only)
        </label>
        <ErrorNote>{error}</ErrorNote>
        {result && (
          <div className="flex gap-2 mb-4">
            <Badge tone="good">{result.chunks_added} text chunks added</Badge>
            <Badge tone="good">{result.figures_added} figures added</Badge>
          </div>
        )}
        <Button className="w-full" onClick={handleUpload} disabled={loading || !file || !subject.trim() || !title.trim()}>
          {loading ? <Spinner /> : "Ingest into RAG"}
        </Button>
        {!adminKey && (
          <p className="text-[11px] text-[var(--text-faint)] mt-3">
            Note: this endpoint isn&apos;t admin-key gated on the backend — anyone with the URL can upload.
          </p>
        )}
      </Card>
    </Shell>
  );
}
