"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Field, Input, Button, ErrorNote } from "@/components/ui";
import { CandidateFlowShell } from "@/components/CandidateFlow";
import { local, uuid } from "@/lib/local";

export default function ApplyPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [subjects, setSubjects] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Your name helps us personalize the interview — please add it.");
      return;
    }
    const candidateId = local.candidateId || uuid();
    local.candidateId = candidateId;
    local.candidateName = name.trim();
    local.subjects = subjects
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    router.push("/resume-upload");
  }

  return (
    <CandidateFlowShell step="apply">
      <h1 className="text-3xl mb-2 font-[family-name:var(--font-display)] font-semibold">Tell us about you</h1>
      <p className="text-[var(--text-secondary)] mb-8 text-sm">
        This creates your mentor candidate profile. Next, you&apos;ll upload your resume.
      </p>
      <Card>
        <form onSubmit={handleSubmit}>
          <Field label="Full name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ananya Sharma"
              autoFocus
            />
          </Field>
          <Field
            label="Subjects you'd mentor (optional)"
            hint="Comma-separated — e.g. Physics, Mathematics. You can also confirm this from your resume."
          >
            <Input
              value={subjects}
              onChange={(e) => setSubjects(e.target.value)}
              placeholder="Physics, Mathematics"
            />
          </Field>
          <ErrorNote>{error}</ErrorNote>
          <div className="mt-2">
            <Button type="submit" className="w-full">
              Continue to resume upload
            </Button>
          </div>
        </form>
      </Card>
    </CandidateFlowShell>
  );
}
