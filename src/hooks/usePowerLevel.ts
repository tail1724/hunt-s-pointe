import { useEffect, useState } from "react";
import { CREDITS_PER_EVENT, POWER_MATRIX } from "@/lib/credit-schedule";

/**
 * The PressRoom power dial: instead of picking a raw model, the member picks how
 * hard PressRoom thinks along two axes, and sees the credit cost move as they do.
 *
 *   depth  1–8   Speed ↔ Depth   (model + retrieval breadth)
 *   power  1–5   reasoning effort
 *   turbo  bool  unlock maximum reasoning + full multi-book cross-referencing
 *
 * Shared module store (like useNavPlacement) so the dial in the composer and
 * the chat hook that sends the request always read the same setting.
 */

export interface PowerState {
  depth: number; // 1..8
  power: number; // 1..5
  turbo: boolean;
}

// Each depth stop maps to a concrete model + RAG breadth. Model ids match the
// server's ALLOWED_MODELS set in prompt-partner.
const DEPTH_STOPS: { model: string; topK: number }[] = [
  { model: "google/gemini-2.5-flash-lite", topK: 3 }, // 1
  { model: "google/gemini-2.5-flash-lite", topK: 3 }, // 2
  { model: "google/gemini-2.5-flash", topK: 5 },      // 3
  { model: "google/gemini-2.5-flash", topK: 5 },      // 4
  { model: "google/gemini-2.5-pro", topK: 7 },        // 5
  { model: "google/gemini-2.5-pro", topK: 7 },        // 6
  { model: "google/gemini-2.5-pro", topK: 10 },       // 7
  { model: "google/gemini-2.5-pro", topK: 10 },       // 8
];

const KEY = "pressroom.powerLevel";
const DEFAULT: PowerState = { depth: 3, power: 2, turbo: false };

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

function read(): PowerState {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const p = JSON.parse(raw);
    return {
      depth: clamp(p.depth ?? DEFAULT.depth, 1, 8),
      power: clamp(p.power ?? DEFAULT.power, 1, 5),
      turbo: !!p.turbo,
    };
  } catch {
    return DEFAULT;
  }
}

// Module-level store so every consumer stays in lockstep.
let current: PowerState = read();
const listeners = new Set<(p: PowerState) => void>();

function commit(next: PowerState) {
  current = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l(next));
}

/** Pure derivation from a power state — model, retrieval breadth, credit cost. */
export function derivePower(s: PowerState) {
  const stop = DEPTH_STOPS[clamp(s.depth, 1, 8) - 1];
  const depthFactor = POWER_MATRIX.depthFactor[clamp(s.depth, 1, 8) - 1];
  const powerFactor = 1 + (clamp(s.power, 1, 5) - 1) * POWER_MATRIX.powerStep;
  const turboFactor = s.turbo ? POWER_MATRIX.turboFactor : 1;
  const creditMultiplier = depthFactor * powerFactor * turboFactor;
  const estCredits = Math.max(1, Math.round(CREDITS_PER_EVENT.partner_message * creditMultiplier));
  return { model: stop.model, topK: stop.topK, creditMultiplier, estCredits };
}

export function usePowerLevel() {
  const [state, setState] = useState<PowerState>(current);

  useEffect(() => {
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  const setDepth = (depth: number) => commit({ ...current, depth: clamp(depth, 1, 8) });
  const setPower = (power: number) => commit({ ...current, power: clamp(power, 1, 5) });
  const setTurbo = (turbo: boolean) => commit({ ...current, turbo });

  return { ...state, setDepth, setPower, setTurbo, ...derivePower(state) };
}
