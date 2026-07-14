/**
 * Lightweight CTA + event tracking utility.
 *
 * Emits a CustomEvent on `window` named "cta" (or any other name you pass).
 * Remix authors plug their analytics (Posthog, GA, Plausible, etc.) in
 * one place by listening for these events — no per-component changes needed.
 *
 * Example listener:
 *   window.addEventListener("cta", (e) => posthog.capture(e.detail.name, e.detail));
 */

export interface TrackPayload {
  name: string;
  location?: string;
  [key: string]: unknown;
}

export function trackCTA(name: string, location?: string, extra?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const detail: TrackPayload = { name, location, ...extra };
  window.dispatchEvent(new CustomEvent("cta", { detail }));
  // Lightweight console breadcrumb in dev only
  if (import.meta.env.DEV) console.debug("[cta]", detail);
}

export function trackEvent(eventName: string, payload?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(eventName, { detail: payload ?? {} }));
  if (import.meta.env.DEV) console.debug(`[event:${eventName}]`, payload);
}
