"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Volume2, VolumeX, LogOut } from "lucide-react";
import { Shell, Badge, Button, ErrorNote, Spinner } from "@/components/ui";
import { TranscriptPanel } from "@/components/interview/TranscriptPanel";
import { Composer } from "@/components/interview/Composer";
import { CodePanel } from "@/components/interview/CodePanel";
import { DrawPanel } from "@/components/interview/DrawPanel";
import { RapidFirePanel } from "@/components/interview/RapidFirePanel";
import { SpotMistakePanel } from "@/components/interview/SpotMistakePanel";
import { CaseStudyPanel } from "@/components/interview/CaseStudyPanel";
import { FigurePanel } from "@/components/interview/FigurePanel";
import { useAntiCheat } from "@/components/interview/useAntiCheat";
import { useCameraAntiCheat } from "@/components/interview/useCameraAntiCheat";
import { useVideoRecorder } from "@/components/interview/useVideoRecorder";
import { useAudioAntiCheat } from "@/components/interview/useAudioAntiCheat";
import { CameraPreview, LiveIntegrityBadges } from "@/components/interview/CameraPreview";
import { useLiveKitVoice } from "@/components/interview/useLiveKitVoice";
import { VoicePanel } from "@/components/interview/VoicePanel";
import { api, AnswerFormat, ApiError, CodeExecutionResult, QuestionMeta, SessionState, TranscriptEvent } from "@/lib/api";
import { speakText, stopSpeaking } from "@/lib/speech";
import { local } from "@/lib/local";

const CODE_FORMATS: AnswerFormat[] = ["code", "debug_code"];
const DRAW_FORMATS: AnswerFormat[] = ["sketchpad", "diagram", "whiteboard_teaching"];

export default function InterviewPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [events, setEvents] = useState<TranscriptEvent[]>([]);
  const [phase, setPhase] = useState("warmup");
  const [format, setFormat] = useState<AnswerFormat | "voice">("voice");
  const [pendingQuestion, setPendingQuestion] = useState<QuestionMeta | null>(null);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [sending, setSending] = useState(false);
  const [muted, setMuted] = useState(false);
  const [ending, setEnding] = useState(false);
  const [lastExecution, setLastExecution] = useState<CodeExecutionResult | null>(null);
  const hasSpokenInitial = useRef(false);

  useAntiCheat(sessionId, phase !== "completed");

  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const { cameraStatus, liveFlags, getStream } = useCameraAntiCheat(sessionId, cameraVideoRef, phase !== "completed");

  // Local video recording (chunked upload to backend disk) + offline
  // post-process trigger, and the second-voice-detection mic listener —
  // both piggyback on the same "interview is live" condition as the camera.
  const videoRecorder = useVideoRecorder(sessionId, getStream);
  useAudioAntiCheat(sessionId, phase !== "completed");
  const recordingStartedRef = useRef(false);

  useEffect(() => {
    if (phase !== "completed" && cameraStatus === "active" && !recordingStartedRef.current) {
      recordingStartedRef.current = true;
      videoRecorder.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraStatus, phase]);

  const refreshSessionForVoice = useCallback(async () => {
    try {
      const session = await api.getSession(sessionId);
      setEvents(session.transcript_events || []);
      setPhase(session.phase);
      if (session.current_format) setFormat(session.current_format);
      setPendingQuestion(session.pending_question || null);
    } catch {
      /* best-effort background poll */
    }
  }, [sessionId]);

  const voice = useLiveKitVoice({
    sessionId,
    candidateId: local.candidateId || sessionId,
    onTranscriptRefresh: refreshSessionForVoice,
  });

  useEffect(() => {
    setAiSpeaking(voice.aiSpeaking);
  }, [voice.aiSpeaking]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const session = await api.getSession(sessionId);
        if (cancelled) return;
        setEvents(session.transcript_events || []);
        setPhase(session.phase);
        setFormat(session.current_format || "voice");
        if (session.pending_question) setPendingQuestion(session.pending_question);
        if (!hasSpokenInitial.current) {
          hasSpokenInitial.current = true;
          const last = session.transcript_events?.[session.transcript_events.length - 1];
          if (last?.speaker === "ai") {
            setAiSpeaking(true);
            speakText(last.text, { muted, onEnd: () => setAiSpeaking(false) });
          }
        }
      } catch (e) {
        setError(e instanceof ApiError ? e.detail : "Couldn't load this interview session.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const refreshPendingQuestion = useCallback(async () => {
    try {
      const session: SessionState = await api.getSession(sessionId);
      setPendingQuestion(session.pending_question || null);
    } catch {
      /* best-effort */
    }
  }, [sessionId]);

  function appendCandidate(text: string, fmt: string, extra?: Partial<TranscriptEvent>) {
    setEvents((prev) => [
      ...prev,
      { speaker: "candidate", text, phase, format: fmt, timestamp: new Date().toISOString(), ...extra },
    ]);
  }

  function appendAi(text: string, fmt: string) {
    setEvents((prev) => [
      ...prev,
      { speaker: "ai", text, phase, format: fmt, timestamp: new Date().toISOString() },
    ]);
    // While the LiveKit voice pipeline is connected, Edge-TTS speaks the
    // reply server-side through the room — don't double up with browser TTS.
    if (voice.status !== "connected") {
      setAiSpeaking(true);
      speakText(text, { muted, onEnd: () => setAiSpeaking(false) });
    }
  }

  async function handleTextSend(text: string) {
    setSending(true);
    setError("");
    appendCandidate(text, format);
    try {
      const res = await api.speak(sessionId, text, format);
      setPhase(res.phase);
      if (res.format) setFormat(res.format as AnswerFormat);
      appendAi(res.message, res.format || format);
      refreshPendingQuestion();
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Couldn't send that answer — try again.");
    } finally {
      setSending(false);
    }
  }

  async function handleSkip() {
    setSending(true);
    setError("");
    appendCandidate("[declined to answer]", format);
    try {
      const res = await api.skip(sessionId);
      appendAi(res.message, format);
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Couldn't skip right now.");
    } finally {
      setSending(false);
    }
  }

  async function handleCodeSubmit(code: string, language: string, stdin: string, expectedOutput?: string) {
    setSending(true);
    setError("");
    appendCandidate(`Submitted ${language} code`, format, {
      execution: { ran: true, language, status: "submitted", stdout: "", stderr: "", compile_output: "" },
    });
    try {
      const res = await api.answerCode(sessionId, code, language, stdin, expectedOutput);
      setPhase(res.phase);
      if (res.format) setFormat(res.format as AnswerFormat);
      appendAi(res.message, res.format || format);
      // The real execution result (stdout/stderr/pass-fail) only lands in the
      // session's transcript, not the turn response — pull it so CodePanel's
      // "matched expected output" readout reflects reality, not the stub.
      try {
        const session = await api.getSession(sessionId);
        setEvents(session.transcript_events || []);
        setPendingQuestion(session.pending_question || null);
        const lastCandidateExec = [...(session.transcript_events || [])]
          .reverse()
          .find((e) => e.speaker === "candidate" && e.execution)?.execution;
        if (lastCandidateExec) setLastExecution(lastCandidateExec);
      } catch {
        /* falls back to the optimistic stub already appended */
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Couldn't run/submit that code.");
    } finally {
      setSending(false);
    }
  }

  async function handleImageSubmit(blob: Blob) {
    setSending(true);
    setError("");
    appendCandidate("Submitted a drawing", format, { image_path: "local-preview" });
    try {
      const res = await api.answerImage(sessionId, blob);
      setPhase(res.phase);
      if (res.format) setFormat(res.format as AnswerFormat);
      appendAi(res.message, res.format || format);
      refreshPendingQuestion();
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Couldn't submit that drawing.");
    } finally {
      setSending(false);
    }
  }

  async function handleEnd() {
    setEnding(true);
    try {
      if (voice.status === "connected") await voice.disconnect();
      // Flush the last video chunk + tell the backend to run the offline
      // post-process pass. Best-effort — never blocks ending the interview.
      await videoRecorder.finalize().catch(() => null);
      await api.end(sessionId);
      local.sessionId = sessionId;
      router.push(`/completed?session=${sessionId}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Couldn't end the interview right now.");
      setEnding(false);
    }
  }

  function toggleMute() {
    setMuted((m) => {
      if (!m) stopSpeaking();
      return !m;
    });
  }

  if (loading) {
    return (
      <Shell narrow>
        <div className="flex items-center justify-center py-24">
          <Spinner className="w-6 h-6" />
        </div>
      </Shell>
    );
  }

  return (
    <div className="console-theme min-h-screen flex flex-col bg-[var(--paper)] text-[var(--ink)]">
      <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-soft)] flex-wrap gap-2">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-2 h-2 rounded-full bg-[var(--good)]" />
          <span className="text-sm font-medium">JEEINDIA Interview</span>
          <PhaseBadge phase={phase} />
          {pendingQuestion && (
            <>
              <Badge>{pendingQuestion.topic}</Badge>
              <Badge tone="accent">depth {pendingQuestion.depth_level}/5</Badge>
            </>
          )}
          <LiveIntegrityBadges liveFlags={liveFlags} />
        </div>
        <div className="flex items-center gap-2">
          <VoicePanel
            status={voice.status}
            error={voice.error}
            aiSpeaking={voice.aiSpeaking}
            micMuted={voice.micMuted}
            onConnect={voice.connect}
            onDisconnect={voice.disconnect}
            onToggleMic={voice.toggleMic}
          />
          <button
            onClick={toggleMute}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
            title={muted ? "Unmute AI voice" : "Mute AI voice"}
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <Button variant="secondary" onClick={handleEnd} disabled={ending}>
            {ending ? <Spinner /> : <LogOut size={14} />}
            End interview
          </Button>
        </div>
      </header>

      {error && (
        <div className="px-6 pt-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      <div className="flex-1 grid lg:grid-cols-2 gap-6 p-6 min-h-0">
        <div className="bg-[var(--surface)] border border-[var(--border-soft)] rounded-[var(--radius-lg)] p-5 min-h-[420px] max-h-[calc(100vh-140px)] flex flex-col relative">
          {/* Camera anti-cheat preview — always mounted (hidden video element
              needed for face/object detection) but only visually shown once active,
              tucked in the corner so it doesn't dominate the UI. */}
          <div className="absolute top-4 right-4 z-10">
            <CameraPreview videoRef={cameraVideoRef} cameraStatus={cameraStatus} />
          </div>
          <TranscriptPanel events={events} aiSpeaking={aiSpeaking} phase={phase} />
        </div>

        <div className="bg-[var(--surface)] border border-[var(--border-soft)] rounded-[var(--radius-lg)] p-5 min-h-[420px] flex flex-col">
          {phase === "completed" ? (
            <div className="m-auto text-center text-[var(--text-muted)] text-sm">
              This interview has ended.{" "}
              <a href={`/completed?session=${sessionId}`} className="text-[var(--accent)] underline">
                View your results →
              </a>
            </div>
          ) : CODE_FORMATS.includes(format as AnswerFormat) ? (
            <CodePanel
              onSubmit={handleCodeSubmit}
              submitting={sending}
              debugMode={format === "debug_code"}
              sessionId={sessionId}
              testCases={pendingQuestion?.test_cases}
              lastExecution={lastExecution}
            />
          ) : format === "rapid_fire" ? (
            <RapidFirePanel
              onSend={handleTextSend}
              onSkip={handleSkip}
              sending={sending}
              questionKey={pendingQuestion?.question_id}
            />
          ) : format === "spot_mistake" ? (
            <SpotMistakePanel
              statement={pendingQuestion?.text || ""}
              onSend={handleTextSend}
              onSkip={handleSkip}
              sending={sending}
            />
          ) : format === "case_study" ? (
            <CaseStudyPanel
              scenario={pendingQuestion?.text || ""}
              onSend={handleTextSend}
              onSkip={handleSkip}
              sending={sending}
            />
          ) : format === "graph_interpretation" ? (
            <FigurePanel
              imageAsset={pendingQuestion?.image_asset}
              onSend={handleTextSend}
              onSkip={handleSkip}
              sending={sending}
            />
          ) : DRAW_FORMATS.includes(format as AnswerFormat) ? (
            <DrawPanel
              onSubmit={handleImageSubmit}
              submitting={sending}
              label={
                format === "sketchpad"
                  ? "Work through it — numbers, steps, whatever you'd write on paper"
                  : format === "diagram"
                  ? "Draw the diagram"
                  : "Teach it on the whiteboard as you would to a student"
              }
            />
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex-1" />
              <Composer
                onSend={handleTextSend}
                onSkip={handleSkip}
                sending={sending}
                placeholder={
                  phase === "warmup"
                    ? "Tell us which subjects you'd like to be tested on…"
                    : phase === "roleplay"
                    ? "Respond to your student…"
                    : "Type or speak your answer…"
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PhaseBadge({ phase }: { phase: string }) {
  const tones: Record<string, "neutral" | "accent" | "warm" | "good"> = {
    warmup: "neutral",
    adaptive_qa: "accent",
    roleplay: "warm",
    wrapup: "neutral",
    completed: "good",
  };
  const labels: Record<string, string> = {
    warmup: "Warm-up",
    adaptive_qa: "Adaptive Q&A",
    roleplay: "Mentoring roleplay",
    wrapup: "Wrapping up",
    completed: "Completed",
  };
  return <Badge tone={tones[phase] || "neutral"}>{labels[phase] || phase}</Badge>;
}
