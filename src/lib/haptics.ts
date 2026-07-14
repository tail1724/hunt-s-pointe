/**
 * Vibration API is Android-only — iOS Safari has no `navigator.vibrate` at
 * all, so every call here is already a silent no-op on iPhone without a
 * feature check at each call site.
 */
function vibrate(pattern: number | number[]) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  navigator.vibrate(pattern);
}

export const haptics = {
  /** Sending a message, opening/closing the dock, confirming a rename. */
  tap: () => vibrate(10),
  /** A turn's response has finished streaming. */
  turnComplete: () => vibrate([8, 40, 8]),
};
