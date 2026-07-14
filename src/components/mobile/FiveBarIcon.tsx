import { motion, useReducedMotion } from "framer-motion";

interface Props {
  open: boolean;
  className?: string;
}

// Five uneven bars — a small manuscript-line brand mark instead of a stock
// three-bar hamburger. The outer two bars pivot into an X on open; the inner
// three fade away, so the whole shape reads as one continuous gesture.
const BAR_WIDTHS = ["100%", "76%", "100%", "58%", "100%"];

export function FiveBarIcon({ open, className }: Props) {
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion ? { duration: 0 } : { type: "spring" as const, stiffness: 420, damping: 32 };

  return (
    <span
      className={`relative flex h-[18px] w-[22px] flex-col items-start justify-between ${className ?? ""}`}
      aria-hidden
    >
      {BAR_WIDTHS.map((width, i) => {
        const isTop = i === 0;
        const isBottom = i === 4;
        const isEdge = isTop || isBottom;
        return (
          <motion.span
            key={i}
            className="block h-[1.5px] rounded-full bg-current"
            animate={{
              width: open ? "100%" : width,
              rotate: open ? (isTop ? 45 : isBottom ? -45 : 0) : 0,
              y: open ? (isTop ? 8 : isBottom ? -8 : 0) : 0,
              opacity: open && !isEdge ? 0 : 1,
              scale: open && !isEdge ? 0.4 : 1,
            }}
            transition={transition}
          />
        );
      })}
    </span>
  );
}
