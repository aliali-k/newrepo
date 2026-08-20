"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Badge, ErrorNote, Spinner } from "@/components/ui";
import { CandidateFlowShell, fireCandidateToast } from "@/components/CandidateFlow";
import { api, ResumeProfile, ApiError } from "@/lib/api";
import { local } from "@/lib/local";

export default function ResumeUploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done">("idle");
  const [profile, setProfile] = useState<ResumeProfile | null>(null);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState<string | null>(null);
  const [creatingInvite, setCreatingInvite] = useState(false);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setError("");
    setStatus("uploading");
    try {
      const res = await api.uploadResume(f);
      local.resumeId = res.resume_id;
      local.profileId = res.profile_id;
      const p = await api.getProfile(res.profile_id);
      setProfile(p);
      if (p.subjects?.length) local.subjects = p.subjects;
      setStatus("done");
      fireCandidateToast("Resume verified");
    } catch (e) {
      const msg = e instanceof ApiError ? e.detail : "Something went wrong reading that file.";
      setError(msg === "NO_RESUME_FOUND" ? "We couldn't find resume content in that file — try a different PDF/DOCX." : msg);
      setStatus("idle");
    }
  }, []);

  async function handleVerifyGithub(projectTitle: string) {
    if (!profile) return;
    setVerifying(projectTitle);
    try {
      await api.verifyGithub(profile.profile_id, projectTitle);
      const refreshed = await api.getProfile(profile.profile_id);
      setProfile(refreshed);
      fireCandidateToast("GitHub project verified");
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Couldn't verify that project right now.");
    } finally {
      setVerifying(null);
    }
  }

  async function handleContinue() {
    if (!profile) return;
    setCreatingInvite(true);
    setError("");
    try {
      const candidateId = local.candidateId!;
      const name = local.candidateName || "Candidate";
      const subjects = profile.subjects?.length ? profile.subjects : local.subjects;
      const invite = await api.createInvite(candidateId, name, subjects);
      local.inviteToken = invite.token;
      local.inviteId = invite.invite_id;
      router.push(`/invite?token=${encodeURIComponent(invite.token)}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Couldn't create your interview invite.");
    } finally {
      setCreatingInvite(false);
    }
  }

  const initials = (local.candidateName || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <CandidateFlowShell step="resume">
      <h1 className="text-3xl mb-2">Upload your resume</h1>
      <p className="text-[var(--ink-soft)] mb-8 text-sm max-w-xl">
        We read the full text, recover hyperlinks hidden behind plain text (like a
        &quot;GitHub&quot; link), and scrub personal details before anything reaches the interview.
      </p>

      {status !== "done" && (
        <Card
          className={`border-dashed transition-colors ${dragOver ? "border-[var(--signal)]" : ""}`}
        >
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            className="flex flex-col items-center justify-center py-14 text-center cursor-pointer"
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            {status === "uploading" ? (
              <>
                <Spinner className="w-6 h-6 mb-4" />
                <p className="text-sm text-[var(--ink-soft)]">Reading {file?.name}…</p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-[var(--paper-sunk)] mb-4 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-[var(--ink-faint)]" fill="none">
                    <path d="M12 16V4m0 0L7 9m5-5l5 5M5 20h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-sm mb-1">Drop your resume here, or click to browse</p>
                <p className="text-xs text-[var(--ink-faint)]">PDF, DOCX or TXT — up to 10MB</p>
              </>
            )}
          </div>
        </Card>
      )}

      <ErrorNote>{error}</ErrorNote>

      {status === "done" && profile && (
        <div className="animate-rise-in space-y-5 mt-2">
          <Card>
            <div className="flex items-start gap-4 mb-5 pb-5 border-b border-[var(--line-soft)]">
              <div className="w-14 h-14 rounded-full bg-[var(--navy)] text-[var(--paper-raised)] flex items-center justify-center font-[family-name:var(--font-display)] text-lg shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg text-[var(--ink)]">{local.candidateName || "Your profile"}</h2>
                  <Badge tone="good">Processed</Badge>
                </div>
                {profile.subjects?.length > 0 && (
                  <p className="text-sm text-[var(--ink-faint)] mt-0.5">{profile.subjects.join(" · ")}</p>
                )}
              </div>
            </div>

            {profile.skills?.length > 0 && (
              <div className="mb-5">
                <div className="text-xs text-[var(--ink-faint)] mb-2 font-mono-data uppercase tracking-wide">Skills</div>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((s) => (
                    <Badge key={s}>{s}</Badge>
                  ))}
                </div>
              </div>
            )}

            {profile.projects?.length > 0 && (
              <div className="mb-2">
                <div className="text-xs text-[var(--ink-faint)] mb-2 font-mono-data uppercase tracking-wide">Projects</div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {profile.projects.map((p) => {
                    const githubLink = p.links?.find((l) => l.toLowerCase().includes("github.com"));
                    return (
                      <div key={p.title} className="rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--paper)] p-4">
                        <div className="flex items-start justify-between gap-3 mb-1.5">
                          <div className="text-sm font-medium text-[var(--ink)]">{p.title}</div>
                          {githubLink && (
                            <span
                              className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono-data border ${
                                p.github_understanding
                                  ? "bg-[var(--good-soft)] text-[var(--good)] border-transparent"
                                  : "bg-[var(--paper-sunk)] text-[var(--ink-faint)] border-[var(--line)]"
                              }`}
                            >
                              {p.github_understanding ? "✓ verified" : "GitHub"}
                            </span>
                          )}
                        </div>
                        {p.description && (
                          <p className="text-xs text-[var(--ink-soft)] leading-relaxed mb-2">{p.description}</p>
                        )}
                        {githubLink && !p.github_understanding && (
                          <Button
                            variant="secondary"
                            className="text-xs px-3 py-1.5 w-full mt-1"
                            disabled={verifying === p.title}
                            onClick={() => handleVerifyGithub(p.title)}
                          >
                            {verifying === p.title ? <Spinner /> : "Verify on GitHub"}
                          </Button>
                        )}
                        {p.github_understanding && (
                          <div className="mt-2 pt-2 border-t border-[var(--line-soft)] text-xs text-[var(--ink-soft)]">
                            <div className="flex items-center gap-2 mb-1.5">
                              <Badge tone={p.github_understanding.claimed_vs_actual_match === "match" ? "good" : "caution"}>
                                {p.github_understanding.claimed_vs_actual_match.replace("_", " ")}
                              </Badge>
                              <Badge>{p.github_understanding.evidence_strength} evidence</Badge>
                            </div>
                            {p.github_understanding.what_it_does}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {profile.hyperlinks?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[var(--line-soft)]">
                <div className="text-xs text-[var(--ink-faint)] mb-2 font-mono-data uppercase tracking-wide">Links recovered from the document</div>
                <div className="flex flex-wrap gap-2">
                  {profile.hyperlinks.map((h, i) => (
                    <Badge key={i}>{h.link_type}</Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setStatus("idle");
                setProfile(null);
                setFile(null);
              }}
            >
              Upload a different file
            </Button>
            <Button onClick={handleContinue} disabled={creatingInvite}>
              {creatingInvite ? <Spinner /> : "Continue to interview access"}
            </Button>
          </div>
        </div>
      )}
    </CandidateFlowShell>
  );
}
