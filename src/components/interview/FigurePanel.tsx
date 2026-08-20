"use client";

import { useState } from "react";
import { LineChart, Send, ImageOff } from "lucide-react";
import { Button, Spinner, Textarea } from "@/components/ui";
import { figureUrl } from "@/lib/api";

export function FigurePanel({
  imageAsset,
  onSend,
  onSkip,
  sending,
}: {
  imageAsset?: string | null;
  onSend: (text: string) => void;
  onSkip: () => void;
  sending: boolean;
}) {
  const [text, setText] = useState("");
  const [imageFailed, setImageFailed] = useState(false);

  function handleSend() {
    if (!text.trim() || sending) return;
    onSend(text.trim());
    setText("");
  }

  return (
    <div className="flex flex-col h-full" data-answer-surface>
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--good)] bg-[var(--good-soft)] px-2.5 py-1 rounded-full self-start mb-3">
        <LineChart size={12} />
        Read the figure
      </span>

      <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-white flex items-center justify-center min-h-[200px] max-h-[280px] overflow-hidden mb-4">
        {imageAsset && !imageFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={figureUrl(imageAsset)}
            alt="Interview figure to interpret"
            className="max-w-full max-h-[280px] object-contain"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="text-center text-[var(--text-faint)] text-xs px-6 py-8 flex flex-col items-center gap-2">
            <ImageOff size={20} />
            {imageAsset
              ? "Couldn't load this figure — the backend needs a static file mount for rag_books/figures. Answer from the AI's description instead."
              : "No figure attached to this question — answer from the AI's description."}
          </div>
        )}
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What does this show, and what does it mean?"
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
