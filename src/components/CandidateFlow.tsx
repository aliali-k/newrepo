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
      <div className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--paper-raised)] pl-3 pr-4 py-2.5 shadow-[0_8px_24px_rgba(22,33,44,0.14)]">
        <span className="w-5 h-5 rounded-full bg-[var(--good-soft)] flex items-center justify-center shrink-0">
          <StatusDot tone="good" />
        </span>
        <span className="text-sm text-[var(--ink)]">{toast}</span>
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
      <header className="w-full px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[7px] bg-[var(--navy)] flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-[2px] bg-[var(--signal)]" />
          </div>
          <span className="font-[family-name:var(--font-display)] text-[15px] font-medium tracking-tight">
            JEEINDIA <span className="text-[var(--ink-faint)] font-normal">/ Round 2</span>
          </span>
        </Link>
        <Link href="/admin" className="text-xs text-[var(--ink-faint)] hover:text-[var(--ink)] transition-colors font-mono-data">
          Admin →
        </Link>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-[220px_1fr] gap-10">
          {/* Left progress rail */}
          <aside className="md:sticky md:top-10 md:self-start">
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
                          done ? "bg-[var(--signal)]" : "bg-[var(--line)]"
                        )}
                      />
                    )}
                    <span
                      className={clsx(
                        "absolute left-0 top-0.5 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-colors",
                        done && "bg-[var(--signal)] border-[var(--signal)]",
                        active && "border-[var(--signal)] bg-[var(--paper)]",
                        !done && !active && "border-[var(--line)] bg-[var(--paper)]"
                      )}
                    >
                      {done && (
                        <svg viewBox="0 0 12 12" className="w-2 h-2 text-[var(--paper-raised)]" fill="none">
                          <path d="M2 6l2.5 2.5L10 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span
                      className={clsx(
                        "text-sm",
                        active && "text-[var(--ink)] font-medium",
                        done && "text-[var(--ink-soft)]",
                        !done && !active && "text-[var(--ink-faint)]"
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
          <div key={step} className="animate-rise-in min-w-0">
            {children}
          </div>
        </div>
      </main>

      <ToastHost />

      <footer className="border-t border-[var(--line-soft)]">
        <div className="max-w-6xl mx-auto px-6 py-5 text-center text-xs text-[var(--ink-faint)] font-mono-data">
          JEEINDIA — Round 2 · Live Adaptive Interview Engine
        </div>
      </footer>
    </div>
  );
}
