/**
 * Lightweight VAD derived from amplitude RMS samples.
 * Maintains a rolling window and reports whether the user has been silent
 * for at least `silenceMs`.
 */
export class SilenceWatcher {
  private windowMs: number;
  private silenceThreshold: number;
  private silenceMs: number;
  private samples: { t: number; rms: number }[] = [];
  private silentSince: number | null = null;

  constructor(opts: { windowMs?: number; silenceThreshold?: number; silenceMs: number }) {
    this.windowMs = opts.windowMs ?? 200;
    this.silenceThreshold = opts.silenceThreshold ?? 0.025;
    this.silenceMs = opts.silenceMs;
  }

  push(rms: number, now = performance.now()): { silentFor: number; isSilent: boolean } {
    this.samples.push({ t: now, rms });
    while (this.samples.length && now - this.samples[0].t > this.windowMs) this.samples.shift();
    const avg = this.samples.reduce((a, s) => a + s.rms, 0) / Math.max(1, this.samples.length);
    const isSilent = avg < this.silenceThreshold;
    if (isSilent) {
      if (this.silentSince == null) this.silentSince = now;
    } else {
      this.silentSince = null;
    }
    return { silentFor: this.silentSince ? now - this.silentSince : 0, isSilent };
  }

  get silenceTargetMs() { return this.silenceMs; }

  reset() { this.samples = []; this.silentSince = null; }
}
