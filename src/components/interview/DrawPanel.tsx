"use client";

import { useRef, useState } from "react";
import { Tldraw, Editor } from "tldraw";
import "tldraw/tldraw.css";
import { Button, Spinner } from "@/components/ui";

export function DrawPanel({
  onSubmit,
  submitting,
  label,
}: {
  onSubmit: (blob: Blob) => void;
  submitting: boolean;
  label: string;
}) {
  const editorRef = useRef<Editor | null>(null);
  const [empty, setEmpty] = useState(true);

  async function handleSubmit() {
    const editor = editorRef.current;
    if (!editor) return;
    const shapeIds = editor.getCurrentPageShapeIds();
    if (shapeIds.size === 0) return;
    const result = await editor.toImage([...shapeIds], {
      format: "png",
      background: true,
      padding: 24,
    });
    if (result?.blob) onSubmit(result.blob);
  }

  return (
    <div className="flex flex-col h-full" data-answer-surface>
      <div className="text-xs text-[var(--text-faint)] mb-2">{label}</div>
      <div className="flex-1 min-h-[320px] rounded-[var(--radius-md)] overflow-hidden border border-[var(--border)] bg-white">
        <Tldraw
          onMount={(editor) => {
            editorRef.current = editor;
            editor.updateInstanceState({ isGridMode: false });
            editor.store.listen(() => {
              setEmpty(editor.getCurrentPageShapeIds().size === 0);
            });
          }}
        />
      </div>
      <div className="mt-3 flex justify-end">
        <Button onClick={handleSubmit} disabled={submitting || empty}>
          {submitting ? <Spinner /> : "Submit drawing"}
        </Button>
      </div>
    </div>
  );
}
