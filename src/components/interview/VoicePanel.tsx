"use client";

import { Mic, MicOff, PhoneCall, PhoneOff, Radio } from "lucide-react";
import { Button, Spinner } from "@/components/ui";
import { VoiceStatus } from "./useLiveKitVoice";

const LABELS: Record<VoiceStatus, string> = {
  idle: "Voice mode off",
  requesting_token: "Getting voice access…",
  connecting: "Connecting…",
  connected: "Live",
  reconnecting: "Reconnecting…",
  disconnected: "Disconnected",
  error: "Voice unavailable",
  unsupported: "Voice not supported here",
};

export function VoicePanel({
  status,
  error,
  aiSpeaking,
  micMuted,
  onConnect,
  onDisconnect,
  onToggleMic,
}: {
  status: VoiceStatus;
  error: string;
  aiSpeaking: boolean;
  micMuted: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onToggleMic: () => void;
}) {
  const busy = status === "requesting_token" || status === "connecting" || status === "reconnecting";
  const live = status === "connected";

  return (
    <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5">
      <span
        className={`flex items-center gap-1.5 text-[11px] font-medium px-2 ${
          live ? "text-[var(--good)]" : status === "error" ? "text-[var(--caution)]" : "text-[var(--text-faint)]"
        }`}
      >
        {live ? (
          <Radio size={12} className={aiSpeaking ? "animate-gentle-pulse" : ""} />
        ) : busy ? (
          <Spinner className="w-3 h-3" />
        ) : (
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
        )}
        {LABELS[status]}
      </span>

      {live && (
        <button
          onClick={onToggleMic}
          className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
            micMuted ? "text-[var(--caution)]" : "text-[var(--text-muted)] hover:text-[var(--text)]"
          }`}
          title={micMuted ? "Unmute mic" : "Mute mic"}
          type="button"
        >
          {micMuted ? <MicOff size={14} /> : <Mic size={14} />}
        </button>
      )}

      {live ? (
        <Button variant="ghost" onClick={onDisconnect} className="!px-2 !py-1 text-xs" type="button">
          <PhoneOff size={13} />
          End voice
        </Button>
      ) : (
        <Button variant="ghost" onClick={onConnect} disabled={busy} className="!px-2 !py-1 text-xs" type="button">
          {busy ? <Spinner className="w-3 h-3" /> : <PhoneCall size={13} />}
          Talk live
        </Button>
      )}
      {status === "error" && error && <span className="text-[10px] text-[var(--caution)] max-w-[160px] truncate" title={error}>{error}</span>}
    </div>
  );
}
