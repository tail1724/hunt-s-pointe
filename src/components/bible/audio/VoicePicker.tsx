import { Check, Play } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import type { ScriptureAudio } from "@/hooks/useScriptureAudio";

interface Props {
  audio: ScriptureAudio;
  children: React.ReactNode;
}

/** Persona chooser: five typographic voice cards with tap-to-audition. */
export function VoicePicker({ audio, children }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent side="top" align="center" sideOffset={10} className="w-80 p-2">
        <p className="px-2 pb-1.5 pt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Reading voice
        </p>
        <div className="flex flex-col gap-1">
          {audio.personas.map((p) => {
            const activePersona = p.id === audio.personaId;
            return (
              <div
                key={p.id}
                className={cn(
                  "tactile group flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors",
                  activePersona
                    ? "border-accent/60 bg-accent/10"
                    : "border-transparent hover:border-border hover:bg-muted/60",
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    haptics.tap();
                    audio.setPersonaId(p.id);
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="font-display text-sm font-semibold">{p.name}</span>
                    {activePersona && <Check className="h-3.5 w-3.5 text-accent" aria-hidden />}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{p.tagline}</span>
                </button>
                <button
                  type="button"
                  onClick={() => audio.preview(p.id)}
                  aria-label={`Preview ${p.name}`}
                  className="tactile inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground opacity-70 hover:border-accent/60 hover:text-foreground group-hover:opacity-100"
                >
                  <Play className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
        <p className="px-2 pb-1 pt-1.5 text-[11px] leading-snug text-muted-foreground">
          Voices are rendered by this device&apos;s best speech engine, shaped per persona.
        </p>
      </PopoverContent>
    </Popover>
  );
}
