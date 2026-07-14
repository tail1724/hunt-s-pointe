import { useEffect, useState } from "react";

const STAGES = [
  "Fetching Curated Context...",
  "Injecting Persona DNA...",
  "Optimizing for Target Platforms...",
  "Validating Negative Space Constraints...",
];

interface TechnicalPulseProps {
  active: boolean;
}

export function TechnicalPulse({ active }: TechnicalPulseProps) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!active) { setStage(0); return; }
    const interval = setInterval(() => {
      setStage((s) => (s < STAGES.length - 1 ? s + 1 : s));
    }, 1500);
    return () => clearInterval(interval);
  }, [active]);

  if (!active) return null;

  return (
    <div className="space-y-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="shimmer h-full rounded-full" style={{ width: `${((stage + 1) / STAGES.length) * 100}%`, transition: "width 0.5s" }} />
      </div>
      <p className="text-xs font-medium text-muted-foreground animate-pulse">{STAGES[stage]}</p>
    </div>
  );
}
