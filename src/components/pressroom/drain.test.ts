import { describe, it, expect } from "vitest";
import { computeDrainStep } from "./drain";

describe("computeDrainStep", () => {
  it("returns 0 when nothing is behind", () => {
    expect(computeDrainStep({ behind: 0, streamEnded: false, msUntilDeadline: 400, intervalMs: 22 })).toBe(0);
  });

  it("is backlog-proportional while streaming (never below 1)", () => {
    expect(computeDrainStep({ behind: 1, streamEnded: false, msUntilDeadline: 0, intervalMs: 22 })).toBe(1);
    expect(computeDrainStep({ behind: 24, streamEnded: false, msUntilDeadline: 0, intervalMs: 22 })).toBe(1);
    expect(computeDrainStep({ behind: 48, streamEnded: false, msUntilDeadline: 0, intervalMs: 22 })).toBe(2);
    expect(computeDrainStep({ behind: 240, streamEnded: false, msUntilDeadline: 0, intervalMs: 22 })).toBe(10);
  });

  it("ignores the deadline while the stream is still live", () => {
    const withCloseDeadline = computeDrainStep({ behind: 240, streamEnded: false, msUntilDeadline: 5, intervalMs: 22 });
    const withFarDeadline = computeDrainStep({ behind: 240, streamEnded: false, msUntilDeadline: 5000, intervalMs: 22 });
    expect(withCloseDeadline).toBe(withFarDeadline);
  });

  it("once the stream ends, solves for the step that lands exactly on the deadline", () => {
    // 220 chars behind, 5 ticks of 22ms left (110ms) → needs 44/tick to finish in time.
    const step = computeDrainStep({ behind: 220, streamEnded: true, msUntilDeadline: 110, intervalMs: 22 });
    expect(step).toBe(44);
  });

  it("simulated catch-up drain always finishes within ~400ms of stream end", () => {
    const intervalMs = 22;
    const deadlineMs = 400;
    let behind = 3000; // a long response still buffered when the stream ends
    let elapsed = 0;
    let ticks = 0;
    while (behind > 0 && ticks < 1000) {
      const step = computeDrainStep({
        behind,
        streamEnded: true,
        msUntilDeadline: deadlineMs - elapsed,
        intervalMs,
      });
      behind -= step;
      elapsed += intervalMs;
      ticks += 1;
    }
    expect(behind).toBeLessThanOrEqual(0);
    // One interval of slack for the ceil() rounding at the very last tick.
    expect(elapsed).toBeLessThanOrEqual(deadlineMs + intervalMs);
  });

  it("never returns a step less than 1 once behind is positive, even past the deadline", () => {
    const step = computeDrainStep({ behind: 5, streamEnded: true, msUntilDeadline: -50, intervalMs: 22 });
    expect(step).toBeGreaterThanOrEqual(1);
  });
});
