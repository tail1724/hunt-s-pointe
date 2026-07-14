// Shared microphone + AnalyserNode engine.
// One MediaStream / AudioContext per page; reused across subscribers.

type AmplitudeFrame = { rms: number; bands: Uint8Array };
type Subscriber = (frame: AmplitudeFrame) => void;

let stream: MediaStream | null = null;
let ctx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let source: MediaStreamAudioSourceNode | null = null;
let rafId: number | null = null;
let timeBuf: Uint8Array | null = null;
let freqBuf: Uint8Array | null = null;
const subs = new Set<Subscriber>();

export type MicError = "permission-denied" | "no-device" | "unsupported" | "unknown";

export async function requestMic(): Promise<{ stream: MediaStream; analyser: AnalyserNode }> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("unsupported");
  }
  if (stream && analyser && ctx && ctx.state !== "closed") {
    return { stream, analyser };
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e: any) {
    const name = e?.name || "";
    if (name === "NotAllowedError" || name === "SecurityError") throw new Error("permission-denied");
    if (name === "NotFoundError" || name === "OverconstrainedError") throw new Error("no-device");
    throw new Error("unknown");
  }
  const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
  ctx = new AC();
  if (ctx.state === "suspended") {
    try { await ctx.resume(); } catch {}
  }
  source = ctx.createMediaStreamSource(stream);
  analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.6;
  source.connect(analyser);
  timeBuf = new Uint8Array(new ArrayBuffer(analyser.fftSize));
  freqBuf = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
  return { stream, analyser };
}

function loop() {
  if (!analyser || !timeBuf || !freqBuf) return;
  (analyser as any).getByteTimeDomainData(timeBuf);
  (analyser as any).getByteFrequencyData(freqBuf);
  // RMS from time-domain (centered around 128)
  let sum = 0;
  for (let i = 0; i < timeBuf.length; i++) {
    const v = (timeBuf[i] - 128) / 128;
    sum += v * v;
  }
  const rms = Math.min(1, Math.sqrt(sum / timeBuf.length) * 1.6);
  const frame: AmplitudeFrame = { rms, bands: freqBuf };
  subs.forEach((cb) => cb(frame));
  rafId = requestAnimationFrame(loop);
}

export function subscribeAmplitude(cb: Subscriber): () => void {
  subs.add(cb);
  if (rafId == null) rafId = requestAnimationFrame(loop);
  return () => {
    subs.delete(cb);
    if (subs.size === 0 && rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };
}

export function releaseMic() {
  if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
  subs.clear();
  try { source?.disconnect(); } catch {}
  try { analyser?.disconnect(); } catch {}
  try { stream?.getTracks().forEach((t) => t.stop()); } catch {}
  try { ctx?.close(); } catch {}
  source = null; analyser = null; stream = null; ctx = null;
  timeBuf = null; freqBuf = null;
}

export function getSharedStream(): MediaStream | null {
  return stream;
}
