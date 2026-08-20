"use client";

import { useState } from "react";
import Editor from "@monaco-editor/react";
import { CheckCircle2, XCircle, PlayCircle } from "lucide-react";
import { Button, Badge, Spinner } from "@/components/ui";
import { api, ApiError, CodeExecutionResult, TestCase } from "@/lib/api";

const LANGUAGES = [
  { id: "python", label: "Python" },
  { id: "javascript", label: "JavaScript" },
  { id: "cpp", label: "C++" },
  { id: "java", label: "Java" },
];

interface TestCaseRunResult extends CodeExecutionResult {
  passed?: boolean;
}

export function CodePanel({
  onSubmit,
  submitting,
  debugMode,
  sessionId,
  testCases,
  lastExecution,
}: {
  onSubmit: (code: string, language: string, stdin: string, expectedOutput?: string) => void;
  submitting: boolean;
  debugMode?: boolean;
  /** Session id, needed for the trial "Run" button (POST /api/interview/run-code). */
  sessionId?: string;
  /** Section 11 formats 2/7 — pre-generated test cases from the backend, when available. */
  testCases?: TestCase[];
  /** Result of the most recent real submission, if the parent has one (for the "3/5 passed" readout). */
  lastExecution?: CodeExecutionResult | null;
}) {
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(debugMode ? "# Find and fix the bug below\n" : "# Write your solution here\n");
  const [stdin, setStdin] = useState("");
  const [expectedOutput, setExpectedOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState("");
  const [testResults, setTestResults] = useState<Record<number, TestCaseRunResult>>({});

  const hasTestCases = !!testCases && testCases.length > 0;
  const passedCount = Object.values(testResults).filter((r) => r.passed).length;

  async function runOneTestCase(index: number, tc: TestCase) {
    if (!sessionId) return;
    setRunning(true);
    setRunError("");
    try {
      const result = await api.runCode(sessionId, code, language, tc.input, tc.expected_output);
      setTestResults((prev) => ({
        ...prev,
        [index]: { ...result, passed: result.matched_expected_output ?? result.stdout.trim() === tc.expected_output.trim() },
      }));
    } catch (e) {
      setRunError(
        e instanceof ApiError && e.status === 404
          ? "Trial-run isn't wired up on the backend yet — submit directly to see results."
          : e instanceof ApiError
          ? e.detail
          : "Couldn't run that test case."
      );
    } finally {
      setRunning(false);
    }
  }

  async function runAllTestCases() {
    if (!testCases) return;
    for (let i = 0; i < testCases.length; i++) {
      // eslint-disable-next-line no-await-in-loop
      await runOneTestCase(i, testCases[i]);
    }
  }

  function handleFinalSubmit() {
    if (hasTestCases) {
      // Submit against the first (often the sample/visible) test case so the
      // interviewer's scoring pass has something concrete to check, same as
      // the single-case flow below.
      const primary = testCases![0];
      onSubmit(code, language, primary.input, primary.expected_output);
    } else {
      onSubmit(code, language, stdin, expectedOutput || undefined);
    }
  }

  return (
    <div className="flex flex-col h-full" data-answer-surface>
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1.5">
          {LANGUAGES.map((l) => (
            <button
              key={l.id}
              onClick={() => setLanguage(l.id)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                language === l.id
                  ? "bg-[var(--accent-soft)] text-[var(--accent-text)] border-transparent"
                  : "text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text)]"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {hasTestCases && (
            <Badge tone={passedCount === testCases!.length ? "good" : "neutral"}>
              {passedCount}/{testCases!.length} test cases passed
            </Badge>
          )}
          {debugMode && <Badge tone="warm">find the bug</Badge>}
        </div>
      </div>

      <div className="flex-1 min-h-[240px] rounded-[var(--radius-md)] overflow-hidden border border-[var(--border)]">
        <Editor
          height="100%"
          language={language === "cpp" ? "cpp" : language}
          theme="vs-dark"
          value={code}
          onChange={(v) => setCode(v || "")}
          options={{
            fontSize: 13,
            minimap: { enabled: false },
            padding: { top: 14 },
            scrollBeyondLastLine: false,
          }}
        />
      </div>

      {hasTestCases ? (
        <div className="mt-3 max-h-[160px] overflow-y-auto space-y-2 pr-1">
          {testCases!.map((tc, i) => {
            const result = testResults[i];
            return (
              <div key={i} className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-[var(--text-faint)]">
                    Test {i + 1}{tc.hidden ? " (hidden)" : ""} · in: <code className="text-[var(--text-muted)]">{tc.hidden ? "•••" : tc.input || "—"}</code>
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {result && (
                      result.passed ? (
                        <CheckCircle2 size={14} className="text-[var(--good)]" />
                      ) : (
                        <XCircle size={14} className="text-[var(--caution)]" />
                      )
                    )}
                    <button
                      onClick={() => runOneTestCase(i, tc)}
                      disabled={running || !sessionId}
                      className="text-[11px] text-[var(--accent-text)] hover:underline disabled:opacity-40 flex items-center gap-1"
                      type="button"
                    >
                      <PlayCircle size={12} /> Run
                    </button>
                  </div>
                </div>
                {result && !result.passed && (
                  <p className="text-[11px] text-[var(--caution)] mt-1">
                    Got: <code>{result.stdout || result.stderr || result.error || "no output"}</code>
                  </p>
                )}
              </div>
            );
          })}
          <div className="flex justify-end">
            <button
              onClick={runAllTestCases}
              disabled={running || !sessionId}
              className="text-xs text-[var(--accent-text)] hover:underline disabled:opacity-40"
              type="button"
            >
              {running ? "Running…" : "Run all test cases"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-3">
          <input
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            placeholder="stdin (optional)"
            className="flex-1 text-xs rounded-[var(--radius-sm)] bg-[var(--surface-2)] border border-[var(--border)] px-3 py-2 text-[var(--text)] placeholder:text-[var(--text-faint)] outline-none focus:border-[var(--accent)]"
          />
          <input
            value={expectedOutput}
            onChange={(e) => setExpectedOutput(e.target.value)}
            placeholder="expected output (optional)"
            className="flex-1 text-xs rounded-[var(--radius-sm)] bg-[var(--surface-2)] border border-[var(--border)] px-3 py-2 text-[var(--text)] placeholder:text-[var(--text-faint)] outline-none focus:border-[var(--accent)]"
          />
        </div>
      )}

      {runError && <p className="text-[11px] text-[var(--caution)] mt-2">{runError}</p>}

      {lastExecution && (
        <div className="mt-2 flex items-center gap-2 text-[11px]">
          {lastExecution.matched_expected_output === true ? (
            <span className="text-[var(--good)] flex items-center gap-1"><CheckCircle2 size={12} /> Last submission matched expected output</span>
          ) : lastExecution.matched_expected_output === false ? (
            <span className="text-[var(--caution)] flex items-center gap-1"><XCircle size={12} /> Last submission didn't match expected output</span>
          ) : (
            <span className="text-[var(--text-faint)]">Last run status: {lastExecution.status}</span>
          )}
        </div>
      )}

      <div className="mt-3 flex justify-end">
        <Button onClick={handleFinalSubmit} disabled={submitting}>
          {submitting ? <Spinner /> : "Run & submit"}
        </Button>
      </div>
      <p className="text-[11px] text-[var(--text-faint)] mt-2">
        Runs through the code executor, then the result and your code both go to the interviewer.
      </p>
    </div>
  );
}
