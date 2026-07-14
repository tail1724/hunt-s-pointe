import { useEffect } from "react";
import { motion, useSpring } from "framer-motion";
import type { NexusState } from "./NexusAnchor";

interface BiomorphicNucleusProps {
  state: NexusState;
  audioLevel?: number;
  size?: number;
}

const COLORS = {
  from: "hsl(35 100% 60%)",
  to: "hsl(18 100% 50%)",
  glow: "hsl(35 100% 60% / 0.3)",
};

const CONFLICT_COLOR = {
  from: "hsl(40 100% 50%)",
  to: "hsl(25 90% 45%)",
  glow: "hsl(40 100% 50% / 0.4)",
};

const BLOB_IDLE = "M50,15 C65,10 85,25 88,45 C91,65 80,85 60,90 C40,95 15,80 12,60 C9,40 35,20 50,15Z";
const BLOB_MITOSIS_STRETCH = "M25,40 C30,20 45,15 50,15 C55,15 70,20 75,40 C80,55 78,70 65,78 C55,84 45,84 35,78 C22,70 20,55 25,40Z";
const BLOB_CONFLICT = "M50,13 C70,8 88,30 86,50 C84,70 68,90 48,88 C28,86 10,68 14,48 C18,28 30,18 50,13Z";

export function BiomorphicNucleus({ state, audioLevel = 0, size = 120 }: BiomorphicNucleusProps) {
  const isConflict = state === "conflict";
  const colors = isConflict ? CONFLICT_COLOR : COLORS;

  // Voice-reactive scale only (user-driven, not ambient).
  const springScale = useSpring(1, { stiffness: 80, damping: 20 });

  useEffect(() => {
    if (state === "listening") {
      springScale.set(1 + audioLevel * 0.4);
    } else {
      springScale.set(1);
    }
  }, [audioLevel, state, springScale]);

  const getPath = () => {
    if (isConflict) return BLOB_CONFLICT;
    if (state === "processing") return BLOB_MITOSIS_STRETCH;
    return BLOB_IDLE;
  };

  return (
    <div style={{ width: size, height: size }} className="relative flex items-center justify-center">
      {/* Static soft halo — no opacity animation */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
        }}
      />

      <motion.svg
        viewBox="0 0 100 100"
        style={{
          width: "80%",
          height: "80%",
          scale: springScale,
        }}
      >
        <defs>
          <radialGradient id="bio-grad-presence" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor={colors.from} stopOpacity="0.9" />
            <stop offset="60%" stopColor={colors.to} stopOpacity="0.6" />
            <stop offset="100%" stopColor={colors.to} stopOpacity="0.1" />
          </radialGradient>
          <filter id="bio-blur">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
          </filter>
        </defs>

        {/* Static fill blob */}
        <path
          d={BLOB_IDLE}
          fill="url(#bio-grad-presence)"
          filter="url(#bio-blur)"
          opacity={0.85}
        />

        {/* State-driven outline: smooth one-shot tween to new shape, no loop */}
        <motion.path
          fill="none"
          stroke={colors.from}
          strokeWidth="1.5"
          opacity={0.85}
          animate={{ d: getPath() }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        />
      </motion.svg>
    </div>
  );
}
