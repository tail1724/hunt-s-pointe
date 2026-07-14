/**
 * Backlog-proportional typewriter step size, shared between useEzraChat's
 * drain loop and its tests.
 *
 * While the stream is still arriving, the step keeps the visible buffer
 * within ~24 ticks of the network buffer — a long response never trails by
 * more than about half a second of backlog, without a scripted burst
 * threshold.
 *
 * Once the stream has ended, there's nothing left to pace against, so
 * instead of continuing to trickle out at reading speed (or snapping
 * instantly, the old behavior), this solves for the exact step that lands
 * the remaining backlog on `msUntilDeadline` — a bounded, still-animated
 * catch-up rather than an abrupt jump.
 */
export function computeDrainStep(params: {
  behind: number;
  streamEnded: boolean;
  msUntilDeadline: number;
  intervalMs: number;
}): number {
  const { behind, streamEnded, msUntilDeadline, intervalMs } = params;
  if (behind <= 0) return 0;
  if (streamEnded) {
    const ticksLeft = Math.max(1, Math.ceil(msUntilDeadline / intervalMs));
    return Math.max(1, Math.ceil(behind / ticksLeft));
  }
  return Math.max(1, Math.ceil(behind / 24));
}
