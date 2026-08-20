// Central API client — talks to the JEEINDIA FastAPI backend.
// Point NEXT_PUBLIC_API_BASE at wherever `uvicorn app.main:app` is running.
// Defaults to localhost:8000 so the two dev servers connect automatically.

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(
  path: string,
  init?: RequestInit & { adminKey?: string }
): Promise<T> {
  const headers: Record<string, string> = {
    ...(init?.body && !(init.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (init?.adminKey) headers["x-admin-key"] = init.adminKey;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch (e) {
    throw new ApiError(0, "NETWORK_ERROR — is the backend running at " + API_BASE + "?");
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const j = await res.json();
      detail = j.detail || detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

const get = <T,>(path: string, adminKey?: string) => request<T>(path, { method: "GET", adminKey });
const post = <T,>(path: string, body?: unknown, adminKey?: string) =>
  request<T>(path, {
    method: "POST",
    body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    adminKey,
  });

// Section 8.1 — builds a browser-loadable URL for a QuestionMeta.image_asset
// path (e.g. "rag_books/figures/xyz.png"). Requires the backend to mount its
// /data directory as static files (e.g. `app.mount("/static", StaticFiles(directory=DATA_DIR), name="static")`
// in app/main.py) — that mount doesn't exist yet, so this is forward-ready
// plumbing for FigurePanel; until the mount is added, the image simply 404s
// and FigurePanel falls back to a text-only prompt.
export function figureUrl(imageAsset: string): string {
  const cleaned = imageAsset.replace(/^\/?data\//, "").replace(/^\/+/, "");
  return `${API_BASE}/static/${cleaned}`;
}

export const api = {
  // ---- Resume (Section 9/10) ----
  uploadResume: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return post<{ resume_id: string; profile_id: string; status: string }>("/api/resume/upload", fd);
  },
  getProfile: (profileId: string) => get<ResumeProfile>(`/api/resume/profile/${profileId}`),
  verifyGithub: (profile_id: string, project_title: string, repo_url?: string) =>
    post(`/api/resume/verify-github`, { profile_id, project_title, repo_url }),

  // ---- Invite ----
  createInvite: (candidate_id: string, candidate_name: string, subjects: string[]) =>
    post<{ invite_id: string; token: string }>("/api/invite/create", {
      candidate_id,
      candidate_name,
      subjects,
      expires_in_hours: 48,
    }),
  verifyInvite: (token: string) => post<InviteRecord>("/api/invite/verify", { token }),
  accessInvite: (token: string) => post<{ status: string; invite: InviteRecord }>("/api/invite/access", { token }),

  // ---- Interview ----
  startInterview: (payload: {
    candidate_id: string;
    invite_id?: string;
    profile_id?: string;
    languages?: string[];
    subjects?: string[];
  }) => post<{ session_id: string; phase: string; message: string }>("/api/interview/start", payload),

  speak: (session_id: string, text: string, format = "voice") =>
    post<TurnResponse>("/api/interview/speak", { session_id, text, format }),

  answerText: (session_id: string, text: string) =>
    post<TurnResponse>("/api/interview/answer-text", { session_id, text }),

  answerCode: (session_id: string, code: string, language: string, stdin = "", expected_output?: string) =>
    post<TurnResponse>("/api/interview/answer-code", { session_id, code, language, stdin, expected_output }),

  // Non-committing trial run for a single test case — lets the candidate see
  // pass/fail before submitting the answer for real. Falls back gracefully
  // (throws ApiError) until the backend adds POST /api/interview/run-code;
  // callers should catch and show "test running needs backend support".
  runCode: (session_id: string, code: string, language: string, stdin = "", expected_output?: string) =>
    post<CodeExecutionResult>("/api/interview/run-code", { session_id, code, language, stdin, expected_output }),

  answerImage: (session_id: string, blob: Blob, filename = "answer.png") => {
    const fd = new FormData();
    fd.append("session_id", session_id);
    fd.append("file", blob, filename);
    return post<TurnResponse>("/api/interview/answer-image", fd);
  },

  skip: (session_id: string) => post<{ status: string; message: string }>("/api/interview/skip", { session_id }),

  end: (session_id: string) => post<FinalEvaluation>("/api/interview/end", { session_id }),

  getSession: (sessionId: string) => get<SessionState>(`/api/interview/session/${sessionId}`),

  // ---- Voice (LiveKit) ----
  voiceToken: (session_id: string, candidate_id: string) =>
    post<{ url?: string; token?: string; room?: string }>("/api/voice/token", { session_id, candidate_id }),
  voiceConnect: (session_id: string) => post<{ status: string }>("/api/voice/connect", { session_id }),
  voiceDisconnect: (session_id: string) => post<{ status: string }>("/api/voice/disconnect", { session_id }),
  voiceReconnect: (session_id: string) => post<{ status: string; resumed_phase: string }>("/api/voice/reconnect", { session_id }),

  // ---- Anti-cheat ----
  // event_type is deliberately `string`, not the server's stricter Literal —
  // the camera layer (gaze/phone/face-match) sends event types the backend
  // doesn't validate yet (see AntiCheatEventType below); those calls no-op
  // safely (caught here) until app/models.py's Literal is extended.
  reportEvent: (session_id: string, event_type: string, detail = "") =>
    post("/api/anticheat/event", { session_id, event_type, detail }).catch(() => null),

  analyzeAudio: (session_id: string, blob: Blob, filename = "segment.webm") => {
    const fd = new FormData();
    fd.append("session_id", session_id);
    fd.append("file", blob, filename);
    return post<{ available: boolean; num_speakers_detected?: number; second_voice_detected: boolean; detail: string }>(
      "/api/anticheat/analyze-audio",
      fd
    ).catch(() => null);
  },

  // ---- Video recording + offline post-process ----
  uploadVideoChunk: (session_id: string, chunk_index: number, blob: Blob) => {
    const fd = new FormData();
    fd.append("session_id", session_id);
    fd.append("chunk_index", String(chunk_index));
    fd.append("file", blob, `chunk_${chunk_index}.webm`);
    return post<{ received_chunk: number; total_chunks_received: number }>(
      "/api/anticheat/video/chunk",
      fd
    ).catch(() => null);
  },
  finalizeVideo: (session_id: string, runPostprocessNow = true) => {
    const fd = new FormData();
    fd.append("session_id", session_id);
    fd.append("run_postprocess_now", String(runPostprocessNow));
    return post<{ video_recording_complete: boolean; video_post_process_status: string; chunks_saved: number }>(
      "/api/anticheat/video/finalize",
      fd
    ).catch(() => null);
  },
  // Fire-and-forget finalize for the "candidate closes the tab / navigates
  // away mid-test" case — normal fetch() calls get cancelled by the browser
  // during unload, so this uses navigator.sendBeacon instead, which the
  // browser guarantees gets sent even as the page is torn down. Whatever
  // chunks already reached the backend (uploaded every few seconds while
  // recording) get finalized and post-processed — nothing is thrown away
  // just because "End interview" was never clicked.
  finalizeVideoBeacon: (session_id: string) => {
    if (typeof navigator === "undefined" || !navigator.sendBeacon) return false;
    const fd = new FormData();
    fd.append("session_id", session_id);
    fd.append("run_postprocess_now", "true");
    try {
      return navigator.sendBeacon(`${API_BASE}/api/anticheat/video/finalize`, fd);
    } catch {
      return false;
    }
  },
  triggerPostprocess: (sessionId: string, adminKey?: string) =>
    post<{ video_post_process_status: string }>(`/api/anticheat/video/postprocess/${sessionId}`, undefined, adminKey),
  videoStatus: (sessionId: string) => get<VideoStatus>(`/api/anticheat/video/status/${sessionId}`),
  flaggedFrames: (sessionId: string) =>
    get<{ session_id: string; flagged_frames: FlaggedFrame[] }>(`/api/anticheat/video/flagged-frames/${sessionId}`),

  // ---- Admin ----
  adminCandidates: (adminKey: string) => get<SessionState[]>("/api/admin/candidates", adminKey),
  adminCandidate: (sessionId: string, adminKey: string) =>
    get<SessionState>(`/api/admin/candidate/${sessionId}`, adminKey),
  adminVerdict: (session_id: string, decision: string, notes: string, adminKey: string) =>
    post("/api/admin/verdict", { session_id, decision, notes }, adminKey),
  adminTranscripts: (adminKey: string) =>
    get<{ session_id: string; events: TranscriptEvent[] }[]>("/api/admin/transcripts", adminKey),

  // ---- RAG admin (Section 8 — book/figure ingestion) ----
  ragUploadBook: (subject: string, title: string, file: File, extractFigures = true) => {
    const fd = new FormData();
    fd.append("subject", subject);
    fd.append("title", title);
    fd.append("file", file);
    fd.append("extract_figures", String(extractFigures));
    return post<{ status: string; title: string; subject: string; chunks_added: number; figures_added: number }>(
      "/api/rag/upload-book",
      fd
    );
  },
  ragStatus: () => get<Record<string, unknown>>("/api/rag/status"),
};

// ---------------------------------------------------------------------------
// Types mirrored from app/models.py
// ---------------------------------------------------------------------------

export type AnswerFormat =
  | "voice"
  | "code"
  | "sketchpad"
  | "diagram"
  | "rapid_fire"
  | "spot_mistake"
  | "debug_code"
  | "case_study"
  | "graph_interpretation"
  | "whiteboard_teaching";

export interface TurnResponse {
  session_id: string;
  phase: string;
  message: string;
  format?: AnswerFormat | string;
  question?: string | null;
}

export interface TranscriptEvent {
  timestamp: string;
  speaker: "ai" | "candidate" | "system";
  text: string;
  phase: string;
  format: string;
  interruption?: boolean;
  image_path?: string | null;
  execution?: CodeExecutionResult | null;
}

export interface CodeExecutionResult {
  ran: boolean;
  language: string;
  status: string;
  stdout: string;
  stderr: string;
  compile_output: string;
  matched_expected_output?: boolean | null;
  error?: string | null;
}

export interface TestCase {
  input: string;
  expected_output: string;
  hidden?: boolean;
}

export interface QuestionMeta {
  question_id: string;
  text: string;
  topic: string;
  subject: string;
  bucket: string;
  difficulty: number;
  depth_level: number;
  format: AnswerFormat;
  image_asset?: string | null;
  // Not yet emitted by the backend (models.py has no TestCase model yet) —
  // the frontend renders these when present so it's a drop-in once the
  // backend's QuestionMeta.test_cases lands.
  test_cases?: TestCase[];
}

// Client-side anti-cheat event types. The first 7 already exist in the
// backend's AntiCheatEventType Literal (app/models.py); the rest are new
// camera-layer events this frontend now produces — the backend needs to add
// them to that Literal (+ severity rules in anti_cheat.py) before the server
// half will act on them. reportEvent() no-ops safely until then.
export type ClientAntiCheatEventType =
  | "copy_paste_attempt"
  | "gaze_away"
  | "devtools_open"
  | "tab_switch"
  | "window_blur"
  | "second_voice_detected"
  | "ai_generated_speech_suspected"
  | "no_face_detected"
  | "multiple_people_detected"
  | "phone_detected"
  | "face_mismatch"
  | "baseline_face_captured"
  | "camera_permission_denied"
  | "voice_connection_dropped";

export interface SessionState {
  session_id: string;
  candidate_id: string;
  phase: "warmup" | "adaptive_qa" | "roleplay" | "wrapup" | "completed";
  elapsed_seconds: number;
  subjects: string[];
  current_topic?: string | null;
  current_depth: number;
  current_format: AnswerFormat;
  candidate_tier: "novice" | "competent" | "expert";
  used_formats: string[];
  pending_question?: QuestionMeta | null;
  roleplay_persona?: string | null;
  transcript_events: TranscriptEvent[];
  final_evaluation?: FinalEvaluation | null;
  status: "in_progress" | "completed" | "abandoned";
  integrity_status: "clean" | "flagged" | "terminated";
}

export interface FinalEvaluation {
  session_id: string;
  engineering_depth_pct: number;
  mentoring_quality_pct: number;
  resume_authenticity_pct: number;
  weighted_overall_score: number;
  level_bucket: "Beginner Mentor" | "Ready" | "Expert Mentor";
  borderline: boolean;
  weak_topics: string[];
  strong_topics: string[];
  reasoning_summary: string;
  integrity_status: "clean" | "flagged" | "terminated";
  integrity_flags: string[];
}

export interface GitHubProjectUnderstanding {
  repo_url: string;
  what_it_does: string;
  actual_technologies: string[];
  claimed_vs_actual_match: string;
  architectural_complexity: string;
  curveball_questions: string[];
  evidence_strength: string;
  flags: string[];
}

export interface ProjectClaim {
  title: string;
  description: string;
  technologies: string[];
  links: string[];
  evidence_strength: string;
  tested: boolean;
  github_understanding?: GitHubProjectUnderstanding | null;
}

export interface ResumeProfile {
  profile_id: string;
  resume_id: string;
  subjects: string[];
  skills: string[];
  projects: ProjectClaim[];
  claims: { text: string; type: string; priority: string }[];
  mentoring_signals: string[];
  red_flags: string[];
  hyperlinks: { url: string; anchor_text: string; link_type: string }[];
}

export interface FlaggedFrame {
  frame_id: string;
  event_type: string;
  video_timestamp_seconds: number;
  image_path: string; // relative to DATA_DIR — build a URL with flaggedFrameUrl()
  detail: string;
  confidence?: number | null;
  created_at: string;
}

export interface VideoStatus {
  session_id: string;
  video_chunks_received: number;
  video_recording_complete: boolean;
  video_post_process_status: "not_started" | "queued" | "running" | "done" | "failed";
  video_post_process_error?: string | null;
  flagged_frame_count: number;
  video_full_path?: string | null; // "videos/<sid>/full.webm" — full stitched recording, build a URL with videoFullUrl()
}

// Same pattern as figureUrl() — image_path is "flagged_frames/<sid>/f_0001.jpg",
// relative to DATA_DIR, served via the backend's /static mount.
export function flaggedFrameUrl(imagePath: string): string {
  const cleaned = imagePath.replace(/^\/?data\//, "").replace(/^\/+/, "");
  return `${API_BASE}/static/${cleaned}`;
}

// video_full_path -> playable URL for the single stitched interview
// recording (all 5s chunks concatenated server-side into one webm).
export function videoFullUrl(videoFullPath: string): string {
  const cleaned = videoFullPath.replace(/^\/?data\//, "").replace(/^\/+/, "");
  return `${API_BASE}/static/${cleaned}`;
}

export interface InviteRecord {
  invite_id: string;
  candidate_id: string;
  candidate_name: string;
  subjects: string[];
  used: boolean;
  expires_at: number;
}
