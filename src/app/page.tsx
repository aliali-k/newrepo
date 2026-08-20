"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, StatusDot } from "@/components/ui";

const METRICS = [
  { value: "10", label: "answer formats" },
  { value: "Live", label: "in your language" },
  { value: "0", label: "scripted questions" },
  { value: "Instant", label: "human-reviewed verdicts" },
];

const STEPS = [
  { n: "Apply", body: "Tell us who you are and what you've built." },
  { n: "We verify", body: "Resume, GitHub, and projects checked against real code." },
  { n: "One conversation", body: "A live interview that adapts to what you actually say." },
  { n: "Clear next steps", body: "A verdict you can see, not a black-box score." },
];

const FORMATS = [
  { name: "Voice", detail: "Speak your answer, like a real conversation." },
  { name: "Code", detail: "Write and run code in a live editor." },
  { name: "Sketchpad", detail: "Draw out a diagram or architecture." },
  { name: "Case study", detail: "Work through an open-ended scenario." },
  { name: "Rapid fire", detail: "Quick-hit questions, no time to overthink." },
  { name: "Figure reading", detail: "Read a graph or circuit and explain it." },
  { name: "Spot the mistake", detail: "Find what's wrong in a piece of code." },
  { name: "Debug live", detail: "Fix a failing test in front of us." },
  { name: "Whiteboard teach", detail: "Explain a concept as if mentoring someone." },
  { name: "Project defense", detail: "Justify a real decision from your own repo." },
];

const RUN_LINES = [
  { q: "Walk me through how your resume's GitHub project handles retries.", tag: "question" },
  { q: "We use exponential backoff with a jitter window before...", tag: "transcript" },
  { q: "evaluating engineering_depth", tag: "status" },
];

function LiveRunMock() {
  const [visible, setVisible] = useState(1);
  useEffect(() => {
    const id = setInterval(() => {
      setVisible((v) => (v >= RUN_LINES.length ? 1 : v + 1));
    }, 2200);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-6 font-mono-data text-[12.5px] shadow-2xl shadow-black/40 overflow-hidden relative">
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
      <div className="relative">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <StatusDot live tone="accent" />
            <span className="text-[var(--text-secondary)] tracking-wide">run · interview-8841</span>
          </div>
          <span className="text-[var(--text-quaternary)]">evaluating</span>
        </div>
        <div className="space-y-3 min-h-[120px]">
          {RUN_LINES.slice(0, visible).map((line, i) => (
            <div key={i} className="animate-slide-up leading-relaxed">
              <span
                className={
                  line.tag === "status"
                    ? "text-[var(--accent-text)]"
                    : line.tag === "question"
                    ? "text-[var(--text)]"
                    : "text-[var(--text-tertiary)]"
                }
              >
                {line.q}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-5 pt-4 border-t border-[var(--border)] flex items-center gap-2">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-glow" style={{ animation: "glow 1.5s ease-in-out infinite" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-quaternary)]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-quaternary)]" />
          </div>
          <span className="text-[var(--text-quaternary)] text-[11px]">adaptive_qa · depth 3/5</span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--accent-active)] flex items-center justify-center shadow-lg shadow-[var(--accent)]/20">
              <div className="w-2 h-2 rounded-sm bg-white/90" />
            </div>
            <span className="font-[family-name:var(--font-display)] text-[15px] font-semibold tracking-tight">
              JEEINDIA
            </span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/apply" className="text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors">
              For Candidates
            </Link>
            <Link href="/admin" className="text-[var(--text-tertiary)] hover:text-[var(--text)] transition-colors">
              For Recruiters
            </Link>
            <Link href="/admin" className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text)] transition-colors font-mono-data">
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-6">
        {/* Hero */}
        <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center py-20 lg:py-28">
          <div className="animate-slide-up">
            <span className="inline-flex items-center gap-1.5 text-xs font-mono-data text-[var(--accent-text)] bg-[var(--accent-soft)] border border-[var(--accent)]/20 rounded-full px-3 py-1 mb-6">
              <StatusDot tone="accent" /> Round 2 · live adaptive interview
            </span>
            <h1 className="text-[2.75rem] sm:text-6xl leading-[1.05] mb-6 font-[family-name:var(--font-display)] font-semibold tracking-tight">
              <span className="gradient-text">Interviews that</span>
              <br />
              <span className="accent-gradient-text">actually listen.</span>
            </h1>
            <p className="text-[var(--text-secondary)] text-lg max-w-md leading-relaxed mb-8">
              JEEINDIA runs live, adaptive interviews — voice, code, and case
              studies in one conversation, judged the moment you speak.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/apply">
                <Button>Start your application</Button>
              </Link>
              <Link href="/invite">
                <Button variant="secondary">I have an invite link</Button>
              </Link>
            </div>
          </div>
          <div className="animate-scale-in" style={{ animationDelay: "0.15s" }}>
            <LiveRunMock />
          </div>
        </section>

        {/* Metrics */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-20 border-b border-[var(--border)] stagger">
          {METRICS.map((m) => (
            <div
              key={m.label}
              className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-5 py-5 hover:border-[var(--border-hover)] transition-colors"
            >
              <div className="font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--text)] mb-0.5">{m.value}</div>
              <div className="text-xs text-[var(--text-tertiary)]">{m.label}</div>
            </div>
          ))}
        </section>

        {/* How it works */}
        <section className="py-20">
          <h2 className="text-sm font-mono-data uppercase tracking-wider text-[var(--text-tertiary)] mb-8">How it works</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 stagger">
            {STEPS.map((s, i) => (
              <div
                key={s.n}
                className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-[var(--border-hover)] transition-all hover:-translate-y-0.5"
              >
                <div className="w-9 h-9 rounded-lg bg-[var(--accent-soft)] border border-[var(--accent)]/20 flex items-center justify-center mb-4">
                  <span className="text-[var(--accent-text)] text-sm font-mono-data font-medium">{i + 1}</span>
                </div>
                <h3 className="text-base mb-1.5 text-[var(--text)] font-medium">{s.n}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Formats */}
        <section className="py-20 border-t border-[var(--border)]">
          <h2 className="text-sm font-mono-data uppercase tracking-wider text-[var(--text-tertiary)] mb-8">
            Ten formats — the interview picks whichever fits the question
          </h2>
          <div className="flex flex-wrap gap-2.5">
            {FORMATS.map((f) => (
              <div
                key={f.name}
                className="group relative rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:border-[var(--accent)]/40 hover:text-[var(--text)] hover:bg-[var(--accent-soft)] transition-all cursor-default"
              >
                {f.name}
                <span className="pointer-events-none absolute left-0 top-full mt-2 w-56 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--text-secondary)] opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all shadow-2xl shadow-black/40 z-10">
                  {f.detail}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between text-xs text-[var(--text-tertiary)] font-mono-data">
          <span>JEEINDIA — Round 2 Interview Engine</span>
          <span>Live · Adaptive · Human-reviewed</span>
        </div>
      </footer>
    </div>
  );
}
