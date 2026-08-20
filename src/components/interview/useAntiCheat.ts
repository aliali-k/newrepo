"use client";

import { useEffect } from "react";
import { api } from "@/lib/api";

// DevTools open detector — window-size-delta trick (Master Build Doc §18 /
// gap-analysis #6): when DevTools docks inside the browser window, the gap
// between outerWidth/outerHeight and innerWidth/innerHeight jumps well past
// normal scrollbar/toolbar sizes. Debounced + re-armed so a single resize
// doesn't false-positive but a genuinely open panel gets caught even if it's
// opened more than once in a session.
const DEVTOOLS_SIZE_THRESHOLD = 160;

export function useAntiCheat(sessionId: string | null, active: boolean) {
  useEffect(() => {
    if (!sessionId || !active) return;

    function onVisibility() {
      if (document.hidden) {
        api.reportEvent(sessionId!, "tab_switch", "document hidden");
      }
    }
    function onBlur() {
      api.reportEvent(sessionId!, "window_blur", "window lost focus");
    }
    function onCopy(e: ClipboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.closest("[data-answer-surface]"))) {
        e.preventDefault();
        api.reportEvent(sessionId!, "copy_paste_attempt", "paste blocked in answer surface");
      }
    }

    let devtoolsOpen = false;
    function checkDevtools() {
      const widthDelta = window.outerWidth - window.innerWidth;
      const heightDelta = window.outerHeight - window.innerHeight;
      const isOpen = widthDelta > DEVTOOLS_SIZE_THRESHOLD || heightDelta > DEVTOOLS_SIZE_THRESHOLD;
      if (isOpen && !devtoolsOpen) {
        devtoolsOpen = true;
        api.reportEvent(sessionId!, "devtools_open", `widthDelta=${widthDelta} heightDelta=${heightDelta}`);
      } else if (!isOpen && devtoolsOpen) {
        devtoolsOpen = false; // re-arm so re-opening DevTools fires again
      }
    }
    const devtoolsInterval = setInterval(checkDevtools, 1000);

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("paste", onCopy, true);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("paste", onCopy, true);
      clearInterval(devtoolsInterval);
    };
  }, [sessionId, active]);
}
