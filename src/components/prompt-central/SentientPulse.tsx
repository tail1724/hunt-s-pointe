import { useEffect, useState } from "react";

const DEFAULT_STAGES = [
  "Analyzing project context…",
  "Cross-referencing intent parameters…",
  "Building context layers…",
  "Refining output candidates…",
];

const RESEARCH_STAGES = [
  "Searching knowledge base…",
  "Synthesizing research findings…",
  "Cross-referencing sources…",
  "Compiling insights…",
];

interface SentientPulseProps {
  mode?: "chat" | "research";
}

export function SentientPulse({ mode = "chat" }: SentientPulseProps) {
  const [stage, setStage] = useState(0);
  const stages = mode === "research" ? RESEARCH_STAGES : DEFAULT_STAGES;

  useEffect(() => {
    setStage(0);
    const interval = setInterval(() => {
      setStage((s) => (s + 1) % stages.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [mode, stages.length]);

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="h-2 w-2 rounded-full bg-primary" />
      <span className="text-sm text-muted-foreground font-mono">
        {stages[stage]}
      </span>
    </div>
  );
}
