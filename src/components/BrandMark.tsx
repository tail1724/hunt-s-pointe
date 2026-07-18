import { useId } from "react";

// Magic Marker Purple — the AI-accent color of the vibrant light theme (see
// src/index.css). The bolt glyph doubles as "PressRoom is here" everywhere
// it appears, so its gradient is the same purple used for AI suggestions.
const ACCENT = "#A855F7";
const ACCENT_HI = "#C084FC";

/** The bolt glyph alone — reused anywhere the full wordmark doesn't fit (app shell tiles, favicons-in-JSX, etc). Name kept for import stability; renders the Hunt's Pointe / PressRoom mark. */
export function PressRoomBoltIcon({ size = 17, className }: { size?: number; className?: string }) {
  const gradId = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`hp-bolt-${gradId}`} x1="6" y1="4.5" x2="17" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={ACCENT_HI} />
          <stop offset="1" stopColor={ACCENT} />
        </linearGradient>
      </defs>
      <path d="M6 4.5h9l-2.2 4.2H17L8 20l2.4-7.1H6L6 4.5Z" fill={`url(#hp-bolt-${gradId})`} />
    </svg>
  );
}

/**
 * The full lockup: bolt tile + "Hunt's Pointe" wordmark, with "Hunt's" set in
 * the site's Spectral display serif and "Pointe" as a quieter tracked-out mono
 * companion word — the same serif/mono pairing used for eyebrows throughout
 * the public site, so the mark reads as part of the same type system.
 * Self-contained (inline styles, literal colors) so it renders identically
 * regardless of the surrounding theme.
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
  const primaryColor = tone === "dark" ? "#F5F3FF" : "#171717";
  const secondaryColor = tone === "dark" ? "rgba(245,243,255,.62)" : "#737373";
  const lineColor = tone === "dark" ? "rgba(245,243,255,.22)" : "#D8D4C4";

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
          background: "linear-gradient(155deg,#2a1c35,#19101f)",
          boxShadow: "0 1px 0 rgba(255,255,255,.18) inset, 0 6px 18px rgba(88,28,135,.28)",
        }}
      >
        <PressRoomBoltIcon size={size * 0.53} />
      </span>
      {showWordmark && (
        <span style={{ display: "inline-flex", alignItems: "baseline", gap: 8, lineHeight: 1 }}>
          <span
            style={{
              fontFamily: "'Spectral', Georgia, serif",
              fontWeight: 600,
              fontSize: size * 0.42,
              letterSpacing: "-0.01em",
              color: primaryColor,
            }}
          >
            Hunt's
          </span>
          <span
            style={{
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              fontSize: Math.max(size * 0.2, 9),
              letterSpacing: ".16em",
              textTransform: "uppercase",
              color: secondaryColor,
              paddingLeft: 9,
              borderLeft: `1px solid ${lineColor}`,
            }}
          >
            Pointe
          </span>
        </span>
      )}
    </span>
  );
}
