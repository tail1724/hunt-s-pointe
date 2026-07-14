// Tiny oscillator-based UI sounds. No audio assets.
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function reducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function blip(freq: number, durMs: number, peak = 0.06, type: OscillatorType = "sine") {
  if (reducedMotion()) return;
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const now = c.currentTime;
  const dur = durMs / 1000;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(peak, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

export function playActivate() { blip(220, 70, 0.08); }
export function playFinalize() { blip(440, 90, 0.05); }
export function playCancel() {
  if (reducedMotion()) return;
  const c = getCtx(); if (!c) return;
  const osc = c.createOscillator(); const gain = c.createGain();
  osc.type = "sine";
  const now = c.currentTime;
  osc.frequency.setValueAtTime(520, now);
  osc.frequency.exponentialRampToValueAtTime(180, now + 0.18);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.06, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
  osc.connect(gain).connect(c.destination);
  osc.start(now); osc.stop(now + 0.22);
}
export function playTick() { blip(660, 40, 0.04); }
