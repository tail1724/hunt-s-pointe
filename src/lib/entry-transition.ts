/**
 * Entry transition store — "Ink Settling" overlay between the public site
 * and the authenticated workspace. Plain useSyncExternalStore, no deps.
 */
import { useSyncExternalStore } from "react";

export type EntryPhase = "idle" | "drawing" | "holding" | "exiting";

// The overlay fades in slowly over 1s before the ink stroke plays — an
// intentional beat added to the sign-in transition.
export const FADE_IN_MS = 1000;
const DRAW_MS = 1100;
const HOLD_MS = 2000;
const MAX_VISIBLE_MS = FADE_IN_MS + DRAW_MS + HOLD_MS + 1400;
const EXIT_MS = 520;
const SESSION_KEY = "pressroom:entry-played";
const REQUEST_KEY = "pressroom:entry-requested";

type State = {
  phase: EntryPhase;
  startedAt: number;
  ready: boolean;
};

let state: State = { phase: "idle", startedAt: 0, ready: false };
const listeners = new Set<() => void>();
let maxTimer: number | null = null;
let exitTimer: number | null = null;
let minHoldTimer: number | null = null;
// True once the minimum hold window has elapsed — exit still waits for `ready` after this.
let holdSatisfied = false;

function emit() {
  for (const l of listeners) l();
}

function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  emit();
}

function clearTimers() {
  if (maxTimer !== null) { clearTimeout(maxTimer); maxTimer = null; }
  if (exitTimer !== null) { clearTimeout(exitTimer); exitTimer = null; }
  if (minHoldTimer !== null) { clearTimeout(minHoldTimer); minHoldTimer = null; }
}

function beginExit() {
  if (state.phase === "exiting" || state.phase === "idle") return;
  setState({ phase: "exiting" });
  exitTimer = window.setTimeout(() => {
    clearTimers();
    state = { phase: "idle", startedAt: 0, ready: false };
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
      sessionStorage.removeItem(REQUEST_KEY);
    } catch {}
    emit();
  }, EXIT_MS);
}

export function requestEntryTransition() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.setItem(REQUEST_KEY, "1");
  } catch {}
}

function hasEntryTransitionRequest() {
  try { return sessionStorage.getItem(REQUEST_KEY) === "1"; } catch { return false; }
}

export function shouldRunEntryTransition() {
  if (typeof window === "undefined") return false;
  return state.phase !== "idle" || hasEntryTransitionRequest();
}

export function playEntryTransition() {
  if (typeof window === "undefined") return;
  try { if (sessionStorage.getItem(SESSION_KEY) && !hasEntryTransitionRequest()) return; } catch {}
  if (state.phase !== "idle") return;
  clearTimers();
  holdSatisfied = false;
  state = { phase: "drawing", startedAt: Date.now(), ready: false };
  emit();
  // Move to "holding" after the slow fade-in and the ink stroke complete.
  window.setTimeout(() => {
    if (state.phase === "drawing") {
      setState({ phase: "holding" });
      // Minimum hold window — only exit once this has elapsed *and* the
      // workspace has signaled it's ready, so slow auth/network never cuts
      // the transition short and fast auth never skips it either.
      minHoldTimer = window.setTimeout(() => {
        holdSatisfied = true;
        if (state.ready) beginExit();
      }, HOLD_MS);
    }
  }, FADE_IN_MS + DRAW_MS);
  // Hard cap: force exit no matter what, in case auth never resolves.
  maxTimer = window.setTimeout(() => {
    if (state.phase === "drawing" || state.phase === "holding") beginExit();
  }, MAX_VISIBLE_MS);
}

export function markWorkspaceReady() {
  if (state.phase === "idle") return;
  if (state.ready) return;
  setState({ ready: true });
  if (holdSatisfied && state.phase === "holding") beginExit();
}

// Gracefully dismiss an in-flight transition (e.g. OAuth returned without a
// session) instead of leaving the user stuck on the branded screen.
export function cancelEntryTransition() {
  if (state.phase === "idle") return;
  beginExit();
}

export function resetEntryTransition() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(REQUEST_KEY);
  } catch {}
  clearTimers();
  holdSatisfied = false;
  state = { phase: "idle", startedAt: 0, ready: false };
  emit();
}

export function useEntryTransition(): EntryPhase {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => state.phase,
    () => "idle" as EntryPhase,
  );
}
