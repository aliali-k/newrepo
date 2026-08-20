"use client";

import { useState } from "react";
import { SearchX, Send } from "lucide-react";
import { Button, Spinner, Textarea } from "@/components/ui";

export function SpotMistakePanel({
  statement,
  onSend,
  onSkip,
  sending,
}: {
  /** The (intentionally flawed) statement/claim from the AI's question text. */
  statement: string;
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
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--caution)] bg-[var(--caution-soft)] px-2.5 py-1 rounded-full self-start mb-3">
        <SearchX size={12} />
        Spot the mistake
      </span>

      <div className="rounded-[var(--radius-md)] border border-[var(--caution)]/30 bg-[var(--caution-soft)]/40 px-4 py-4 mb-4">
        <p className="text-sm leading-relaxed text-[var(--text)] font-[family-name:var(--font-sora)]">
          "{statement}"
        </p>
      </div>

      <p className="text-xs text-[var(--text-faint)] mb-2">Find the error above and explain what's actually correct.</p>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="The mistake is… / What's actually true is…"
        rows={4}
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
