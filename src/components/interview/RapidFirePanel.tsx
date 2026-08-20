"use client";

import { useEffect, useRef, useState } from "react";
import { Zap, Send } from "lucide-react";
import { Button, Spinner } from "@/components/ui";

const COUNTDOWN_SECONDS = 12;

export function RapidFirePanel({
  onSend,
  onSkip,
  sending,
  questionKey,
}: {
  onSend: (text: string) => void;
  onSkip: () => void;
  sending: boolean;
  /** Change this (e.g. to the question_id) whenever a new rapid-fire question arrives, to reset the timer. */
  questionKey?: string;
}) {
  const [text, setText] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const inputRef = useRef<HTMLInputElement>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    setText("");
    setSecondsLeft(COUNTDOWN_SECONDS);
    submittedRef.current = false;
    inputRef.current?.focus();
  }, [questionKey]);

  useEffect(() => {
    if (sending) return;
    if (secondsLeft <= 0) {
      if (!submittedRef.current) {
        submittedRef.current = true;
        onSend(text.trim() || "[no answer — time's up]");
      }
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, sending, text, onSend]);

  function handleSend() {
    if (submittedRef.current || sending) return;
    submittedRef.current = true;
    onSend(text.trim());
  }

  const urgent = secondsLeft <= 4;

  return (
    <div className="flex flex-col h-full" data-answer-surface>
      <div className="flex items-center justify-between mb-4">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--warm-text)] bg-[var(--warm-soft)] px-2.5 py-1 rounded-full">
          <Zap size={12} />
          Rapid fire
        </span>
        <span
          className={`text-2xl font-[family-name:var(--font-sora)] tabular-nums transition-colors ${
            urgent ? "text-[var(--caution)] animate-gentle-pulse" : "text-[var(--text-muted)]"
          }`}
        >
          {secondsLeft}s
        </span>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-3">
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Quick answer…"
          disabled={sending}
          className="w-full text-lg rounded-[var(--radius-md)] bg-[var(--surface-2)] border border-[var(--border)] px-4 py-3 text-[var(--text)] placeholder:text-[var(--text-faint)] outline-none focus:border-[var(--accent)]"
        />
        <div className="h-1 rounded-full bg-[var(--surface-3)] overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 linear ${urgent ? "bg-[var(--caution)]" : "bg-[var(--accent)]"}`}
            style={{ width: `${(secondsLeft / COUNTDOWN_SECONDS) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between mt-4">
        <Button variant="ghost" onClick={onSkip} disabled={sending} type="button">
          Skip
        </Button>
        <Button onClick={handleSend} disabled={sending} type="button">
          {sending ? <Spinner /> : <Send size={15} />}
          Answer now
        </Button>
      </div>
    </div>
  );
}
