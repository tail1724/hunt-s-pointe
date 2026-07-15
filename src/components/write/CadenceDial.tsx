import { useMemo } from "react";
import { computeCadence } from "@/lib/authenticity/cadence";
import { tellDensity } from "@/lib/authenticity/tells";
import { cn } from "@/lib/utils";

/**
 * The always-on, zero-cost half of the authenticity layer (addendum
 * features 12 & 14) — burstiness and AI-tell density computed client-side
 * from the document text already in memory. No model call, no latency.
 */
export function CadenceDial({ contentText }: { contentText: string }) {
  const cadence = useMemo(() => computeCadence(contentText), [contentText]);
  const density = useMemo(() => tellDensity(contentText), [contentText]);

  if (cadence.verdict === "insufficient-data") return null;

  const flattened = cadence.verdict === "flattened";
  const hasTells = density > 0;

  return (
    <div className="inline-flex items-center gap-2.5" title="Sentence-length variance (burstiness) and AI-tell vocabulary density, computed locally">
      <span className={cn("inline-flex items-center gap-1", flattened ? "text-guardrail" : "text-verified")}>
        <span className={cn("h-1.5 w-1.5 rounded-full", flattened ? "bg-guardrail" : "bg-verified")} />
        Cadence {flattened ? "flattened" : "human-like"}
      </span>
      {hasTells && (
        <span className="inline-flex items-center gap-1 text-guardrail">
          <span className="h-1.5 w-1.5 rounded-full bg-guardrail" />
          {density.toFixed(1)} tells / 1k words
        </span>
      )}
    </div>
  );
}
