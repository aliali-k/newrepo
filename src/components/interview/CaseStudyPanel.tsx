"use client";

import { useState } from "react";
import { GraduationCap, Send } from "lucide-react";
import { Button, Spinner, Textarea } from "@/components/ui";

export function CaseStudyPanel({
  scenario,
  onSend,
  onSkip,
  sending,
}: {
  scenario: string;
  onSend: (text: string) => void;
  onSkip: () => void;
  sending: boolean;
}) {
  const [text, setText] = useState("");

  function handleSend() {
    if (!text.trim() || sending) return;
    onSend(text.trim());
    setText("");
  }

  return (
    <div className="flex flex-col h-full" data-answer-surface>
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent-text)] bg-[var(--accent-soft)] px-2.5 py-1 rounded-full self-start mb-3">
        <GraduationCap size={12} />
        Case study
      </span>

      <div className="rounded-[var(--radius-md)] border-l-4 border-[var(--accent)] bg-[var(--surface-2)] px-4 py-4 mb-4">
        <p className="text-sm leading-relaxed text-[var(--text)] italic">{scenario}</p>
      </div>

      <p className="text-xs text-[var(--text-faint)] mb-2">
        Walk through how you'd actually handle this — your reasoning matters as much as the answer.
      </p>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Here's how I'd approach it…"
        rows={6}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
        }}
      />

      <div className="flex items-center justify-between mt-3">
        <Button variant="ghost" onClick={onSkip} disabled={sending} type="button">
          Skip
        </Button>
        <Button onClick={handleSend} disabled={sending || !text.trim()} type="button">
          {sending ? <Spinner /> : <Send size={15} />}
          Submit
        </Button>
      </div>
    </div>
  );
}
