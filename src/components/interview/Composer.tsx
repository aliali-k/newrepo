"use client";

import { useEffect, useState } from "react";
import { Mic, MicOff, Send } from "lucide-react";
import { Button, Spinner, Textarea } from "@/components/ui";
import { useSpeechToText } from "@/lib/speech";

export function Composer({
  onSend,
  onSkip,
  sending,
  placeholder = "Type or speak your answer…",
}: {
  onSend: (text: string) => void;
  onSkip: () => void;
  sending: boolean;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const { listening, transcript, supported, start, stop } = useSpeechToText();

  useEffect(() => {
    if (transcript) setText(transcript);
  }, [transcript]);

  function handleSend() {
    if (!text.trim() || sending) return;
    onSend(text.trim());
    setText("");
  }

  return (
    <div data-answer-surface>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        rows={3}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
        }}
      />
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          {supported && (
            <button
              onClick={() => (listening ? stop() : start())}
              className={`w-9 h-9 rounded-full flex items-center justify-center border transition-colors ${
                listening
                  ? "bg-[var(--accent-soft)] border-transparent text-[var(--accent-text)] animate-gentle-pulse"
                  : "border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
              title={listening ? "Stop listening" : "Speak your answer"}
              type="button"
            >
              {listening ? <Mic size={16} /> : <MicOff size={16} />}
            </button>
          )}
          <span className="text-xs text-[var(--text-faint)]">
            {listening ? "Listening…" : supported ? "Tap the mic to speak" : "⌘/Ctrl + Enter to send"}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onSkip} disabled={sending} type="button">
            Skip
          </Button>
          <Button onClick={handleSend} disabled={sending || !text.trim()} type="button">
            {sending ? <Spinner /> : <Send size={15} />}
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
