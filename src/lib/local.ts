"use client";

// Thin wrapper around localStorage so candidate identity/profile/session ids
// survive navigation between /apply → /resume-upload → /invite → /consent →
// /interview/[id] → /completed without a real auth layer (the backend has
// none yet — invite tokens are the only access control).

const KEYS = {
  candidateId: "jee_candidate_id",
  candidateName: "jee_candidate_name",
  resumeId: "jee_resume_id",
  profileId: "jee_profile_id",
  subjects: "jee_subjects",
  inviteToken: "jee_invite_token",
  inviteId: "jee_invite_id",
  sessionId: "jee_session_id",
  adminKey: "jee_admin_key",
} as const;

function get(key: string): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(key) || "";
}
function set(key: string, value: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value);
}

export const local = {
  get candidateId() {
    return get(KEYS.candidateId);
  },
  set candidateId(v: string) {
    set(KEYS.candidateId, v);
  },
  get candidateName() {
    return get(KEYS.candidateName);
  },
  set candidateName(v: string) {
    set(KEYS.candidateName, v);
  },
  get resumeId() {
    return get(KEYS.resumeId);
  },
  set resumeId(v: string) {
    set(KEYS.resumeId, v);
  },
  get profileId() {
    return get(KEYS.profileId);
  },
  set profileId(v: string) {
    set(KEYS.profileId, v);
  },
  get subjects(): string[] {
    const raw = get(KEYS.subjects);
    return raw ? JSON.parse(raw) : [];
  },
  set subjects(v: string[]) {
    set(KEYS.subjects, JSON.stringify(v));
  },
  get inviteToken() {
    return get(KEYS.inviteToken);
  },
  set inviteToken(v: string) {
    set(KEYS.inviteToken, v);
  },
  get inviteId() {
    return get(KEYS.inviteId);
  },
  set inviteId(v: string) {
    set(KEYS.inviteId, v);
  },
  get sessionId() {
    return get(KEYS.sessionId);
  },
  set sessionId(v: string) {
    set(KEYS.sessionId, v);
  },
  get adminKey() {
    return get(KEYS.adminKey);
  },
  set adminKey(v: string) {
    set(KEYS.adminKey, v);
  },
};

export function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
