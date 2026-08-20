"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, Field, Input, Button, Badge, ErrorNote, Spinner } from "@/components/ui";
import { CandidateFlowShell, fireCandidateToast } from "@/components/CandidateFlow";
import { api, ApiError, InviteRecord } from "@/lib/api";
import { local } from "@/lib/local";

function InvitePageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [token, setToken] = useState(params.get("token") || local.inviteToken || "");
  const [invite, setInvite] = useState<InviteRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");

  async function verify(t: string) {
    if (!t.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.verifyInvite(t.trim());
      setInvite(res);
      fireCandidateToast("Invite verified");
    } catch (e) {
      const detail = e instanceof ApiError ? e.detail : "Couldn't verify that invite.";
      setError(
        detail === "SESSION_EXPIRED"
          ? "This invite link has expired. Please request a new one."
          : detail === "SESSION_LOCKED"
          ? "This invite has already been used."
          : detail === "INVALID_INVITE"
          ? "That invite link doesn't look valid."
          : detail
      );
      setInvite(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) verify(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAccept() {
    setAccepting(true);
    setError("");
    try {
      await api.accessInvite(token.trim());
      local.inviteToken = token.trim();
      local.inviteId = invite!.invite_id;
      local.candidateId = invite!.candidate_id;
      local.candidateName = invite!.candidate_name;
      local.subjects = invite!.subjects;
      router.push("/consent");
    } catch (e) {
      setError(e instanceof ApiError ? e.detail : "Couldn't start your session.");
    } finally {
      setAccepting(false);
    }
  }

  return (
    <CandidateFlowShell step="invite">
      <h1 className="text-3xl mb-2">Your interview invite</h1>
      <p className="text-[var(--ink-soft)] mb-8 text-sm">
        This is a one-time link scheduled just for you.
      </p>
      <Card>
        {!invite && (
          <>
            <Field label="Invite token">
              <div className="flex gap-2">
                <Input
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste your invite token"
                />
                <Button onClick={() => verify(token)} disabled={loading}>
                  {loading ? <Spinner /> : "Verify"}
                </Button>
              </div>
            </Field>
            <ErrorNote>{error}</ErrorNote>
          </>
        )}

        {invite && (
          <div className="animate-rise-in">
            <p className="text-sm text-[var(--ink-faint)] mb-1">Welcome,</p>
            <h2 className="text-2xl mb-4 text-[var(--ink)]">{invite.candidate_name}</h2>
            {invite.subjects?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {invite.subjects.map((s) => (
                  <Badge key={s} tone="accent">{s}</Badge>
                ))}
              </div>
            )}
            <ErrorNote>{error}</ErrorNote>
            <Button onClick={handleAccept} disabled={accepting} className="w-full mt-2">
              {accepting ? <Spinner /> : "Begin — go to consent"}
            </Button>
          </div>
        )}
      </Card>
    </CandidateFlowShell>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={null}>
      <InvitePageInner />
    </Suspense>
  );
}
