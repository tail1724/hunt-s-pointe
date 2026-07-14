import { NexusAnchor, type NexusState } from "./NexusAnchor";

const STATUS_TEXT: Record<NexusState, string[]> = {
  idle: ["Pulse steady…", "Symbiotic awareness active…", "Breathing with your workflow…"],
  listening: ["Absorbing intent…", "Neural pathways aligning…"],
  processing: [
    "Initiating mitosis…",
    "Cellular division in progress…",
    "Synthesizing context layers…",
    "Aligning biometric harmony…",
  ],
  conflict: ["Bruise detected…", "Resolving tissue conflict…"],
};

interface NexusPulseProps {
  state: NexusState;
  size?: number;
  audioLevel?: number;
  inline?: boolean;
  mode?: string; // kept for backwards compat but ignored
}

export function NexusPulse({ state, audioLevel = 0, size, inline = false }: NexusPulseProps) {
  const texts = STATUS_TEXT[state] || STATUS_TEXT.idle;
  const text = texts[Math.floor(Date.now() / 2400) % texts.length] || "";

  if (inline) {
    return (
      <div className="flex items-center gap-3 px-4 py-3">
        <NexusAnchor state={state} audioLevel={audioLevel} size={size || 32} />
        {text && (
          <span className="text-sm text-muted-foreground">
            {text}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <NexusAnchor state={state} audioLevel={audioLevel} size={80} />
      {text && (
        <span className="text-xs text-muted-foreground">
          {text}
        </span>
      )}
    </div>
  );
}
