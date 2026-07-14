import { useEffect, useState } from "react";

interface Props {
  /** When true, animates from 0 → 1 over durationMs and calls onComplete. */
  active: boolean;
  durationMs: number;
  onComplete: () => void;
  /** Optional border-radius to trace (matches container). */
  radius?: number;
}

/**
 * Magnetic-pull countdown ring. Draws a glowing perimeter stroke that "burns"
 * around its parent over durationMs. Parent must be position: relative.
 */
export function CountdownRing({ active, durationMs, onComplete, radius = 28 }: Props) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) { setProgress(0); return; }
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / durationMs);
      setProgress(t);
      if (t < 1) raf = requestAnimationFrame(tick);
      else onComplete();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, durationMs, onComplete]);

  if (!active && progress === 0) return null;

  // Color blend cool → incandescent amber
  const hue = 40; // accent gold
  const lightness = 55 + progress * 15;
  const glow = 4 + progress * 18;
  const opacity = active ? 1 : 0;

  return (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        opacity,
        transition: "opacity 220ms cubic-bezier(0.34,1.56,0.64,1)",
        filter: `drop-shadow(0 0 ${glow}px hsl(${hue} 80% ${lightness}% / 0.6))`,
      }}
      aria-hidden
    >
      <rect
        x="1" y="1"
        width="calc(100% - 2px)" height="calc(100% - 2px)"
        rx={radius} ry={radius}
        fill="none"
        stroke={`hsl(${hue} 80% ${lightness}%)`}
        strokeWidth="1.5"
        pathLength={1}
        strokeDasharray={`${progress} 1`}
        strokeLinecap="round"
      />
    </svg>
  );
}
