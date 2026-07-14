import { useEffect, useState } from "react";

/**
 * Pipeline stages, driven by the real client-side orchestration in
 * useEzraChat — not a bank of random phrases. What the user reads while
 * waiting is what the system is actually doing.
 */
export type PipelineStage =
  | "idle"
  | "preparing"
  | "scripture"
  | "collection"
  | "retrieving"
  | "found"
  | "connecting"
  | "tools"
  | "streaming";

export interface PipelineState {
  stage: PipelineStage;
  /** Collection name for collection/retrieving, "n passages" for found. */
  detail?: string;
}

export function label({ stage, detail }: PipelineState): string {
  switch (stage) {
    case "preparing":
      return "Reading your question";
    case "scripture":
      return "Resolving Scripture references";
    case "collection":
      return detail ? `Opening “${detail}”` : "Opening your collection";
    case "retrieving":
      return detail ? `Searching “${detail}”` : "Searching your sources";
    case "found":
      return detail ? `Weighing ${detail}` : "Weighing what was found";
    case "connecting":
      return "Composing a response";
    case "tools":
      return "Consulting your saved work";
    default:
      return "Thinking";
  }
}

export function EzraPipelineIndicator({ state }: { state: PipelineState }) {
  const [elapsed, setElapsed] = useState(0);

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const tick = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(tick);
  }, []);

  return (
    <div className="ezra-msg-enter flex items-center gap-2.5 text-xs text-muted-foreground" role="status" aria-live="polite">
      <span className="ezra-pulse-dot" />
      {/* Keyed by stage so each real transition crossfades in. */}
      <span key={state.stage} className={reduceMotion ? "" : "ezra-trace-fade think-shimmer"}>
        {label(state)}…
      </span>
      {elapsed >= 2 && <span className="opacity-50">· {elapsed}s</span>}
    </div>
  );
}
