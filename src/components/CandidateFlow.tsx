"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import clsx from "clsx";
import { StatusDot } from "@/components/ui";

const STEPS = [
  { key: "apply", label: "Your details" },
  { key: "resume", label: "Resume" },
  { key: "invite", label: "Invite" },
  { key: "consent", label: "Consent" },
] as const;

export type FlowStepKey = (typeof STEPS)[number]["key"];

let toastListener: ((msg: string) => void) | null = null;

export function fireCandidateToast(message: string) {
  toastListener?.(message);
}

function ToastHost() {
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    toastListener = (msg: string) => {
      setToast(msg);
      window.setTimeout(() => setToast(null), 2000);
    };
    return () => {
      toastListener = null;
    };
  }, []);

  if (!toast) return null;
  return (
    <div className="fixed top-5 right-5 z-50 animate-toast-in">
      <div className="flex items-center gap-2.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] pl-3 pr-4 py-2.5 shadow-2xl shadow-black/40">
        <span className="w-5 h-5 rounded-full bg-[var(--success-soft)] flex items-center justify-center shrink-0">
          <StatusDot tone="good" />
        </span>
        <span className="text-sm text-[var(--text)]">{toast}</span>
      </div>
    </div>
  );
}

export function CandidateFlowShell({
  step,
  children,
}: {
  step: FlowStepKey;
  children: ReactNode;
}) {
  const activeIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 glass border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--accent-active)] flex items-center justify-center shadow-lg shadow-[var(--accent)]/20">
              <div className="w-2 h-2 rounded-sm bg-white/90" />
            </div>
            <span className="font-[family-name:var(--font-display)] text-[15px] font-semibold tracking-tight">
              JEEINDIA <span className="text-[var(--text-tertiary)] font-normal">/ Round 2</span>
            </span>
          </Link>
          <Link href="/admin" className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text)] transition-colors font-mono-data">
            Admin →
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-[220px_1fr] gap-10">
          {/* Left progress rail */}
          <aside className="md:sticky md:top-20 md:self-start">
            <div className="relative pl-1">
              {STEPS.map((s, i) => {
                const done = i < activeIndex;
                const active = i === activeIndex;
                return (
                  <div key={s.key} className="relative pl-6 pb-8 last:pb-0">
                    {i < STEPS.length - 1 && (
                      <span
                        className={clsx(
                          "absolute left-[7px] top-4 w-px h-full",
                          done ? "bg-[var(--accent)]" : "bg-[var(--border)]"
                        )}
                      />
                    )}
                    <span
                      className={clsx(
                        "absolute left-0 top-0.5 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all",
                        done && "bg-[var(--accent)] border-[var(--accent)]",
                        active && "border-[var(--accent)] bg-[var(--bg)] shadow-[0_0_0_4px_var(--accent-soft)]",
                        !done && !active && "border-[var(--border-hover)] bg-[var(--surface)]"
                      )}
                    >
                      {done && (
                        <svg viewBox="0 0 12 12" className="w-2 h-2 text-white" fill="none">
                          <path d="M2 6l2.5 2.5L10 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span
                      className={clsx(
                        "text-sm transition-colors",
                        active && "text-[var(--text)] font-medium",
                        done && "text-[var(--text-secondary)]",
                        !done && !active && "text-[var(--text-tertiary)]"
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* Right content */}
          <div key={step} className="animate-slide-up min-w-0">
            {children}
          </div>
        </div>
      </main>

      <ToastHost />

      <footer className="border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6 py-5 text-center text-xs text-[var(--text-tertiary)] font-mono-data">
          JEEINDIA — Round 2 · Live Adaptive Interview Engine
        </div>
      </footer>
    </div>
  );
}
