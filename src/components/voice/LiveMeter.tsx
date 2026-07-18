import { useEffect, useRef } from "react";

interface VoiceCanvasProps {
  amplitude: number;
  bands: Uint8Array | null;
  width?: number;
  height?: number;
  active: boolean;
  /** Base color in HSL h,s%. Defaults to pressroom accent gold. */
  hue?: number;
  saturation?: number;
}

const BAR_COUNT = 24;

export function LiveMeter({
  amplitude,
  bands,
  width = 120,
  height = 24,
  active,
  hue = 40,
  saturation = 56,
}: VoiceCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const smoothRef = useRef<Float32Array>(new Float32Array(BAR_COUNT));
  const silenceSinceRef = useRef<number>(0);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
  }, [width, height]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const alpha = 0.35;
    const smooth = smoothRef.current;
    const now = performance.now();
    const isSilent = amplitude < 0.02;
    if (isSilent) {
      if (!silenceSinceRef.current) silenceSinceRef.current = now;
    } else {
      silenceSinceRef.current = 0;
    }
    const flatten = isSilent && now - silenceSinceRef.current > 250;

    // Map bands into BAR_COUNT buckets (log-ish): take first ~96 bins, weighted.
    const src = bands && bands.length ? bands : new Uint8Array(BAR_COUNT);
    const usable = Math.min(src.length, 96);
    for (let i = 0; i < BAR_COUNT; i++) {
      const idx = Math.floor((i / BAR_COUNT) * usable);
      const raw = (src[idx] || 0) / 255;
      const target = flatten ? 0 : raw;
      smooth[i] = smooth[i] * (1 - alpha) + target * alpha;
    }

    ctx.clearRect(0, 0, width, height);
    const gap = 2;
    const barW = Math.max(1.5, (width - gap * (BAR_COUNT - 1)) / BAR_COUNT);
    const mid = height / 2;
    for (let i = 0; i < BAR_COUNT; i++) {
      const v = smooth[i];
      const h = Math.max(1, v * height * 0.95);
      const x = i * (barW + gap);
      const lightness = 45 + v * 30;
      ctx.fillStyle = `hsl(${hue} ${saturation}% ${lightness}%)`;
      const radius = Math.min(barW / 2, h / 2, 2);
      const y = mid - h / 2;
      // rounded bar
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + barW - radius, y);
      ctx.quadraticCurveTo(x + barW, y, x + barW, y + radius);
      ctx.lineTo(x + barW, y + h - radius);
      ctx.quadraticCurveTo(x + barW, y + h, x + barW - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.fill();
    }
  }, [amplitude, bands, width, height, hue, saturation]);

  return (
    <canvas
      ref={ref}
      style={{
        width,
        height,
        display: "block",
        opacity: active ? 1 : 0.4,
        transition: "opacity 200ms ease",
      }}
      aria-hidden
    />
  );
}
