import { useId } from "react";

const BRASS = "#A8823A";
const BRASS_HI = "#C29B4B";

/** The bolt glyph alone — reused anywhere the full wordmark doesn't fit (app shell tiles, favicons-in-JSX, etc). */
export function EzraBoltIcon({ size = 17, className }: { size?: number; className?: string }) {
  const gradId = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`ezra-bolt-${gradId}`} x1="6" y1="4.5" x2="17" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={BRASS_HI} />
          <stop offset="1" stopColor={BRASS} />
        </linearGradient>
      </defs>
      <path d="M6 4.5h9l-2.2 4.2H17L8 20l2.4-7.1H6L6 4.5Z" fill={`url(#ezra-bolt-${gradId})`} />
    </svg>
  );
}

/**
 * The full lockup: bolt tile + "Ezra Research" wordmark, with "Ezra" set in the
 * site's Spectral display serif and "Research" as a quieter tracked-out mono
 * companion word — the same serif/mono pairing used for eyebrows throughout
 * the public site, so the mark reads as part of the same type system.
 * Self-contained (inline styles, literal colors) so it renders identically
 * whether it's dropped inside `.ezra-public` or the app shell.
 */
export function BrandMark({
  size = 32,
  showWordmark = true,
  tone = "light",
  className,
}: {
  size?: number;
  showWordmark?: boolean;
  tone?: "light" | "dark";
  className?: string;
}) {
  const ezraColor = tone === "dark" ? "#E9E2D1" : "#16222D";
  const researchColor = tone === "dark" ? "rgba(233,226,209,.62)" : "#6E7C84";
  const lineColor = tone === "dark" ? "rgba(233,226,209,.22)" : "#D8D4C4";

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 11 }} className={className}>
      <span
        aria-hidden="true"
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.28,
          display: "grid",
          placeItems: "center",
          flex: "none",
          background: "linear-gradient(155deg,#1c2a35,#101922)",
          boxShadow: "0 1px 0 rgba(255,255,255,.18) inset, 0 6px 18px rgba(21,32,41,.28)",
        }}
      >
        <EzraBoltIcon size={size * 0.53} />
      </span>
      {showWordmark && (
        <span style={{ display: "inline-flex", alignItems: "baseline", gap: 8, lineHeight: 1 }}>
          <span
            style={{
              fontFamily: "'Spectral', Georgia, serif",
              fontWeight: 600,
              fontSize: size * 0.42,
              letterSpacing: "-0.01em",
              color: ezraColor,
            }}
          >
            Ezra
          </span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              fontSize: Math.max(size * 0.2, 9),
              letterSpacing: ".16em",
              textTransform: "uppercase",
              color: researchColor,
              paddingLeft: 9,
              borderLeft: `1px solid ${lineColor}`,
            }}
          >
            Research
          </span>
        </span>
      )}
    </span>
  );
}
