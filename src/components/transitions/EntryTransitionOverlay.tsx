import { useState } from "react";
import { useEntryTransition } from "@/lib/entry-transition";

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function EntryTransitionOverlay() {
  const phase = useEntryTransition();
  const [reduced] = useState(prefersReducedMotion);

  if (phase === "idle") return null;

  const exiting = phase === "exiting";

  if (reduced) {
    return (
      <div
        aria-hidden
        data-pressroom-entry-overlay
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2147483000,
          background: "#F7F2E9",
          opacity: exiting ? 0 : 1,
          transition: "opacity 400ms ease-out",
          pointerEvents: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontFamily: "'Spectral', 'Cormorant Garamond', Georgia, serif",
            fontSize: "clamp(64px, 12vw, 112px)",
            fontWeight: 300,
            color: "#1E2A4A",
          }}
        >
          PressRoom
        </div>
      </div>
    );
  }

  return (
    <div
      aria-hidden
      data-pressroom-entry-overlay
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483000,
        isolation: "isolate",
        background:
          "radial-gradient(120% 80% at 50% 40%, #FBF7EE 0%, #F7F2E9 55%, #EFE8D8 100%)",
        opacity: exiting ? 0 : 1,
        transform: exiting ? "translateY(-4px)" : "translateY(0)",
        transition:
          "opacity 520ms cubic-bezier(0.32,0.72,0,1), transform 520ms cubic-bezier(0.32,0.72,0,1)",
        // Intentional 1s slow fade-in before the ink stroke begins.
        animation: exiting ? "none" : "pressroom-overlay-fade 1000ms ease-out both",
        pointerEvents: "auto",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <style>{`
        @keyframes pressroom-overlay-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
      {/* Subtle paper grain */}
      <svg
        width="100%"
        height="100%"
        style={{ position: "absolute", inset: 0, opacity: 0.04, mixBlendMode: "multiply" }}
        aria-hidden
      >
        <filter id="pressroom-paper-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#pressroom-paper-noise)" />
      </svg>

      <div style={{ position: "relative", textAlign: "center" }}>
        <svg
          viewBox="0 0 320 130"
          width="320"
          height="130"
          style={{ display: "block", overflow: "visible" }}
        >
          <style>{`
            @keyframes pressroom-ink-stroke {
              from { stroke-dashoffset: 600; }
              to { stroke-dashoffset: 0; }
            }
            @keyframes pressroom-ink-fill {
              from { fill-opacity: 0; }
              to { fill-opacity: 1; }
            }
            @keyframes pressroom-underline {
              from { stroke-dashoffset: 220; }
              to { stroke-dashoffset: 0; }
            }
            @keyframes pressroom-breathe {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.012); }
            }
            .pressroom-breath {
              transform-origin: 50% 50%;
              transform-box: fill-box;
              animation: pressroom-breathe 6s ease-in-out 1200ms infinite;
            }
            .pressroom-word {
              font-family: 'Spectral', 'Cormorant Garamond', Georgia, serif;
              font-weight: 300;
              font-size: 96px;
              letter-spacing: -0.01em;
              fill: #1E2A4A;
              stroke: #1E2A4A;
              stroke-width: 0.6;
              stroke-dasharray: 600;
              fill-opacity: 0;
              /* Ink begins after the overlay's 1s fade-in settles. */
              animation:
                pressroom-ink-stroke 1100ms cubic-bezier(0.32,0.72,0,1) 1000ms forwards,
                pressroom-ink-fill 360ms ease-out 1900ms forwards;
            }
            .pressroom-underline {
              stroke: #C99B3C;
              stroke-width: 1.25;
              stroke-linecap: round;
              fill: none;
              stroke-dasharray: 220;
              stroke-dashoffset: 220;
              animation: pressroom-underline 1100ms cubic-bezier(0.32,0.72,0,1) 1120ms forwards;
            }
            @keyframes pressroom-caption-in {
              from { opacity: 0; transform: translateY(4px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .pressroom-caption {
              opacity: 0;
              animation: pressroom-caption-in 600ms ease-out 2200ms forwards;
            }
          `}</style>
          <g className="pressroom-breath">
            <text x="50%" y="78" textAnchor="middle" className="pressroom-word">
              PressRoom
            </text>
            <line x1="110" y1="104" x2="210" y2="104" className="pressroom-underline" />
          </g>
        </svg>
        <div
          className="pressroom-caption"
          style={{
            marginTop: 14,
            fontFamily: "'Hanken Grotesk', 'Inter', system-ui, sans-serif",
            fontSize: 12,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(30,42,74,0.55)",
            opacity: exiting ? 0 : undefined,
            transition: exiting ? "opacity 360ms ease-out" : undefined,
          }}
        >
          Preparing your study
        </div>
      </div>
    </div>
  );
}
