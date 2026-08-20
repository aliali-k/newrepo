"use client";

import Link from "next/link";
import { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

export function Shell({
  children,
  narrow = false,
}: {
  children: ReactNode;
  narrow?: boolean;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <main className={clsx("flex-1 w-full mx-auto px-6 py-12", narrow ? "max-w-2xl" : "max-w-5xl")}>
        {children}
      </main>
      <footer className="border-t border-[var(--border)] mt-8">
        <div className="max-w-6xl mx-auto px-6 py-5 text-center text-xs text-[var(--text-tertiary)] font-mono-data">
          JEEINDIA — Round 2 · Live Adaptive Interview Engine
        </div>
      </footer>
    </div>
  );
}

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 glass border-b border-[var(--border)]">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--accent-active)] flex items-center justify-center shadow-lg shadow-[var(--accent)]/20">
            <div className="w-2 h-2 rounded-sm bg-white/90" />
          </div>
          <span className="font-[family-name:var(--font-display)] text-[15px] font-semibold tracking-tight">
            JEEINDIA <span className="text-[var(--text-tertiary)] font-normal">/ Round 2</span>
          </span>
        </Link>
        <Link
          href="/admin"
          className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text)] transition-colors font-mono-data"
        >
          Admin →
        </Link>
      </div>
    </header>
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 transition-colors hover:border-[var(--border-hover)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "warm" | "danger";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] select-none";
  const styles = {
    primary:
      "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-lg shadow-[var(--accent)]/20",
    secondary:
      "bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--surface-3)] hover:border-[var(--border-hover)]",
    ghost:
      "text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]",
    warm:
      "bg-[var(--success)] text-white hover:brightness-110 shadow-lg shadow-[var(--success)]/20",
    danger:
      "bg-[var(--danger)] text-white hover:brightness-110",
  };
  return (
    <button className={clsx(base, styles[variant], className)} {...rest}>
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "warm" | "good" | "caution" | "danger";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)]",
    accent: "bg-[var(--accent-soft)] text-[var(--accent-text)] border-[var(--accent)]/20",
    warm: "bg-[var(--warning-soft)] text-[var(--warning-text)] border-[var(--warning)]/20",
    good: "bg-[var(--success-soft)] text-[var(--success-text)] border-[var(--success)]/20",
    caution: "bg-[var(--warning-soft)] text-[var(--warning-text)] border-[var(--warning)]/20",
    danger: "bg-[var(--danger-soft)] text-[var(--danger-text)] border-[var(--danger)]/20",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border font-mono-data",
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block mb-5">
      <span className="block text-sm font-medium text-[var(--text)] mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-[var(--text-tertiary)] mt-1.5">{hint}</span>}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "w-full rounded-[var(--radius-md)] bg-[var(--surface-2)] border border-[var(--border)] px-3.5 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-quaternary)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 outline-none transition-all",
        props.className
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={clsx(
        "w-full rounded-[var(--radius-md)] bg-[var(--surface-2)] border border-[var(--border)] px-3.5 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-quaternary)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 outline-none transition-all resize-none",
        props.className
      )}
    />
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div className="rounded-[var(--radius-md)] bg-[var(--danger-soft)] border border-[var(--danger)]/20 text-[var(--danger-text)] text-sm px-4 py-3 mt-4 animate-slide-up">
      {children}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "w-4 h-4 rounded-full border-2 border-[var(--border-hover)] border-t-[var(--accent)] animate-spin",
        className
      )}
    />
  );
}

export function AvatarPulse({ speaking = false }: { speaking?: boolean }) {
  return (
    <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
      {speaking && (
        <span className="absolute inset-0 rounded-full bg-[var(--accent)]/20 animate-gentle-pulse" />
      )}
      <div
        className={clsx(
          "w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-active)] flex items-center justify-center transition-transform shadow-lg shadow-[var(--accent)]/20",
          speaking && "scale-105"
        )}
      >
        <div className="w-2.5 h-2.5 rounded-full bg-white/90" />
      </div>
    </div>
  );
}

export function StatusDot({ live = false, tone = "accent" }: { live?: boolean; tone?: "accent" | "good" | "caution" | "neutral" }) {
  const colors: Record<string, string> = {
    accent: "bg-[var(--accent)]",
    good: "bg-[var(--success)]",
    caution: "bg-[var(--warning)]",
    neutral: "bg-[var(--text-tertiary)]",
  };
  return <span className={clsx("inline-block w-2 h-2 rounded-full", colors[tone], live && "status-dot-live")} />;
}
