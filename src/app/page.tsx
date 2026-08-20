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
  { q: "Q: Walk me through how your resume's GitHub project actually handles retries.", tag: "question" },
  { q: "Candidate: We use exponential backoff with a jitter window before...", tag: "transcript" },
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
    <div className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--navy-deep)] p-5 font-mono-data text-[12.5px] shadow-[0_8px_30px_rgba(15,28,43,0.18)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <StatusDot live tone="accent" />
          <span className="text-[#dce9e4] tracking-wide">run · interview-8841</span>
        </div>
        <span className="text-[#6c7c8d]">evaluating</span>
      </div>
      <div className="space-y-2.5 min-h-[110px]">
        {RUN_LINES.slice(0, visible).map((line, i) => (
          <div key={i} className="animate-rise-in text-[#a9b7c6] leading-relaxed">
            <span
              className={
                line.tag === "status"
                  ? "text-[var(--signal)]"
                  : line.tag === "question"
                  ? "text-[#eef3f8]"
                  : "text-[#a9b7c6]"
              }
            >
              {line.q}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="w-full px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[7px] bg-[var(--navy)] flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-[2px] bg-[var(--signal)]" />
          </div>
          <span className="font-[family-name:var(--font-display)] text-[15px] font-medium tracking-tight">
            JEEINDIA
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/apply" className="text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors">
            For Candidates
          </Link>
          <Link href="/admin" className="text-[var(--ink-faint)] hover:text-[var(--ink)] transition-colors">
            For Recruiters
          </Link>
          <Link href="/admin" className="text-xs text-[var(--ink-faint)] hover:text-[var(--ink)] transition-colors font-mono-data">
            Admin
          </Link>
        </nav>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-6">
        <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center py-16 lg:py-24">
          <div className="animate-rise-in">
            <span className="inline-flex items-center gap-1.5 text-xs font-mono-data text-[var(--signal-text)] bg-[var(--signal-soft)] rounded-full px-3 py-1 mb-6">
              <StatusDot tone="accent" /> Round 2 · live adaptive interview
            </span>
            <h1 className="text-[2.75rem] sm:text-6xl leading-[1.02] mb-6 text-[var(--ink)]">
              Interviews that
              <br />
              actually listen.
            </h1>
            <p className="text-[var(--ink-soft)] text-lg max-w-md leading-relaxed mb-8">
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
          <LiveRunMock />
        </section>

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-16 border-b border-[var(--line-soft)]">
          {METRICS.map((m) => (
            <div key={m.label} className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--paper-raised)] px-4 py-4">
              <div className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)] mb-0.5">{m.value}</div>
              <div className="text-xs text-[var(--ink-faint)]">{m.label}</div>
            </div>
          ))}
        </section>

        <section className="py-16">
          <h2 className="text-sm font-mono-data uppercase tracking-wider text-[var(--ink-faint)] mb-6">How it works</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--paper-raised)] p-5">
                <div className="w-8 h-8 rounded-full bg-[var(--navy-soft)] flex items-center justify-center mb-4">
                  <div className="w-2 h-2 rounded-full bg-[var(--navy)]" />
                </div>
                <h3 className="text-base mb-1.5 text-[var(--ink)]">{s.n}</h3>
                <p className="text-sm text-[var(--ink-soft)] leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-16 border-t border-[var(--line-soft)]">
          <h2 className="text-sm font-mono-data uppercase tracking-wider text-[var(--ink-faint)] mb-6">
            Ten formats — the interview picks whichever fits the question
          </h2>
          <div className="flex flex-wrap gap-2.5">
            {FORMATS.map((f) => (
              <div
                key={f.name}
                className="group relative rounded-full border border-[var(--line)] bg-[var(--paper-raised)] px-4 py-2 text-sm text-[var(--ink-soft)] hover:border-[var(--signal)] hover:text-[var(--ink)] transition-colors cursor-default"
              >
                {f.name}
                <span className="pointer-events-none absolute left-0 top-full mt-2 w-56 rounded-[var(--radius-sm)] border border-[var(--line)] bg-[var(--paper-raised)] px-3 py-2 text-xs text-[var(--ink-soft)] opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all shadow-[0_8px_20px_rgba(22,33,44,0.10)] z-10">
                  {f.detail}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--line-soft)]">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between text-xs text-[var(--ink-faint)] font-mono-data">
          <span>JEEINDIA — Round 2 Interview Engine</span>
          <span>Live · Adaptive · Human-reviewed</span>
        </div>
      </footer>
    </div>
  );
}
