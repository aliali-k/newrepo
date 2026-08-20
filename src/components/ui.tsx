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
      <footer className="border-t border-[var(--line-soft)] mt-8">
        <div className="max-w-6xl mx-auto px-6 py-5 text-center text-xs text-[var(--ink-faint)] font-mono-data">
          JEEINDIA — Round 2 · Live Adaptive Interview Engine
        </div>
      </footer>
    </div>
  );
}

export function TopBar() {
  return (
    <header className="w-full px-6 py-5 flex items-center justify-between max-w-6xl mx-auto">
      <Link href="/" className="flex items-center gap-2.5 group">
        <div className="w-7 h-7 rounded-[7px] bg-[var(--navy)] flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-[2px] bg-[var(--signal)]" />
        </div>
        <span className="font-[family-name:var(--font-display)] text-[15px] font-medium tracking-tight text-[var(--ink)]">
          JEEINDIA <span className="text-[var(--ink-faint)] font-normal">/ Round 2</span>
        </span>
      </Link>
      <Link
        href="/admin"
        className="text-xs text-[var(--ink-faint)] hover:text-[var(--ink)] transition-colors font-mono-data"
      >
        Admin →
      </Link>
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
        "bg-[var(--paper-raised)] border border-[var(--line)] rounded-[var(--radius-lg)] p-6 shadow-[0_1px_2px_rgba(22,33,44,0.04)]",
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
  variant?: "primary" | "secondary" | "ghost" | "warm";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-[10px] px-5 py-2.5 text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]";
  const styles = {
    primary: "bg-[var(--navy)] text-[var(--paper-raised)] hover:bg-[var(--navy-deep)]",
    secondary:
      "bg-[var(--paper-raised)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--ink-faint)]",
    ghost: "text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper-sunk)]",
    warm: "bg-[var(--signal)] text-[var(--paper-raised)] hover:bg-[var(--signal-strong)]",
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
  tone?: "neutral" | "accent" | "warm" | "good" | "caution";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-[var(--paper-sunk)] text-[var(--ink-soft)] border-[var(--line)]",
    accent: "bg-[var(--signal-soft)] text-[var(--signal-text)] border-transparent",
    warm: "bg-[var(--warm-soft)] text-[var(--warm-text)] border-transparent",
    good: "bg-[var(--good-soft)] text-[var(--good)] border-transparent",
    caution: "bg-[var(--caution-soft)] text-[var(--caution)] border-transparent",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border font-mono-data",
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
      <span className="block text-sm font-medium text-[var(--ink)] mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-[var(--ink-faint)] mt-1.5">{hint}</span>}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "w-full rounded-[var(--radius-sm)] bg-[var(--paper)] border border-[var(--line)] px-4 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:border-[var(--signal)] outline-none transition-colors",
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
        "w-full rounded-[var(--radius-sm)] bg-[var(--paper)] border border-[var(--line)] px-4 py-3 text-sm text-[var(--ink)] placeholder:text-[var(--ink-faint)] focus:border-[var(--signal)] outline-none transition-colors resize-none",
        props.className
      )}
    />
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div className="rounded-[var(--radius-sm)] bg-[var(--danger-soft)] border border-transparent text-[var(--danger)] text-sm px-4 py-3 mt-4">
      {children}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "w-4 h-4 rounded-full border-2 border-[var(--line)] border-t-[var(--signal)] animate-spin",
        className
      )}
    />
  );
}

export function AvatarPulse({ speaking = false }: { speaking?: boolean }) {
  return (
    <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
      {speaking && (
        <span className="absolute inset-0 rounded-full bg-[var(--signal)]/15 animate-gentle-pulse" />
      )}
      <div
        className={clsx(
          "w-11 h-11 rounded-full bg-[var(--navy)] flex items-center justify-center transition-transform",
          speaking && "scale-105"
        )}
      >
        <div className="w-3 h-3 rounded-full bg-[var(--signal)]" />
      </div>
    </div>
  );
}

export function StatusDot({ live = false, tone = "accent" }: { live?: boolean; tone?: "accent" | "good" | "caution" | "neutral" }) {
  const colors: Record<string, string> = {
    accent: "bg-[var(--signal)]",
    good: "bg-[var(--good)]",
    caution: "bg-[var(--caution)]",
    neutral: "bg-[var(--ink-faint)]",
  };
  return <span className={clsx("inline-block w-2 h-2 rounded-full", colors[tone], live && "status-dot-live")} />;
}
