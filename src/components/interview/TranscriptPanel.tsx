"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";
import { AvatarPulse, Badge } from "@/components/ui";
import { TranscriptEvent } from "@/lib/api";

export function TranscriptPanel({
  events,
  aiSpeaking,
  phase,
}: {
  events: TranscriptEvent[];
  aiSpeaking: boolean;
  phase: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [events.length]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 pb-4 mb-4 border-b border-[var(--border-soft)]">
        <AvatarPulse speaking={aiSpeaking} />
        <div>
          <div className="text-sm font-medium">Interviewer</div>
          <div className="text-xs text-[var(--text-faint)] flex items-center gap-1.5">
            {aiSpeaking ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" /> speaking
              </>
            ) : (
              <>listening</>
            )}
            <span className="mx-1">·</span>
            <PhaseLabel phase={phase} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">
        {events.map((e, i) => (
          <Bubble key={i} event={e} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function PhaseLabel({ phase }: { phase: string }) {
  const labels: Record<string, string> = {
    warmup: "warm-up",
    adaptive_qa: "adaptive Q&A",
    roleplay: "mentoring roleplay",
    wrapup: "wrapping up",
    completed: "completed",
  };
  return <span>{labels[phase] || phase}</span>;
}

function Bubble({ event }: { event: TranscriptEvent }) {
  const isAi = event.speaker === "ai";
  const isSystem = event.speaker === "system";
  if (isSystem) {
    return (
      <div className="text-center text-xs text-[var(--text-faint)] py-1">{event.text}</div>
    );
  }
  return (
    <div className={clsx("flex", isAi ? "justify-start" : "justify-end")}>
      <div
        className={clsx(
          "max-w-[85%] rounded-[var(--radius-md)] px-4 py-2.5 text-sm leading-relaxed animate-rise-in",
          isAi
            ? "bg-[var(--surface-2)] text-[var(--text)] rounded-tl-sm"
            : "bg-[var(--accent-soft)] text-[var(--accent-text)] rounded-tr-sm"
        )}
      >
        {event.format && event.format !== "voice" && event.format !== "text" && !isAi && (
          <Badge>{event.format.replace(/_/g, " ")}</Badge>
        )}
        <div className={event.format && event.format !== "voice" && !isAi ? "mt-1.5" : ""}>
          {formatEventText(event)}
        </div>
      </div>
    </div>
  );
}

function formatEventText(event: TranscriptEvent) {
  if (event.image_path) return "📎 Submitted a drawing/photo answer";
  if (event.execution) {
    return (
      <span>
        Submitted code —{" "}
        <span className={event.execution.status === "Accepted" ? "text-[var(--good)]" : ""}>
          {event.execution.status}
        </span>
      </span>
    );
  }
  if (event.text.startsWith("[Candidate code submission")) {
    return event.text.split("\n")[1] ? "Submitted a code answer" : event.text;
  }
  if (event.text.startsWith("[Candidate submitted a")) return "Submitted a drawing answer";
  return event.text;
}
