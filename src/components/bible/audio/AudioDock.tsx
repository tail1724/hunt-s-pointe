import { useMemo } from "react";
import {
  ChevronsRight, Gauge, MoonStar, Pause, Play, SkipBack, SkipForward, X,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { VoicePicker } from "./VoicePicker";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import type { ScriptureAudio, SleepSetting } from "@/hooks/useScriptureAudio";

const SPEEDS = [0.8, 0.9, 1, 1.1, 1.25, 1.5];
const SLEEP_LABELS: Record<SleepSetting, string> = {
  off: "Off",
  chapter: "End of chapter",
  "15m": "In 15 minutes",
  "30m": "In 30 minutes",
};

interface Props {
  audio: ScriptureAudio;
  bookName: string;
  chapterNumber: number;
  /** Verse-action bar occupies the bottom edge; float above it. */
  raised?: boolean;
}

/** The Listening Room dock: playback, verse scrubbing, persona, speed, sleep. */
export function AudioDock({ audio, bookName, chapterNumber, raised }: Props) {
  const currentVerse = audio.speakingVerse ?? audio.verseIndex + 1;
  const progress = audio.verseCount > 0 ? (audio.verseIndex + (audio.status === "playing" ? 1 : 0)) / audio.verseCount : 0;

  const scrubTicks = useMemo(
    () => (audio.verseCount > 1 && audio.verseCount <= 40
      ? Array.from({ length: audio.verseCount - 1 }, (_, i) => ((i + 1) / audio.verseCount) * 100)
      : []),
    [audio.verseCount],
  );

  if (!audio.active) return null;

  const seekFromPointer = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(0.999, Math.max(0, (e.clientX - rect.left) / rect.width));
    audio.seekVerse(Math.floor(ratio * audio.verseCount));
  };

  return (
    <div
      className={cn(
        "fixed inset-x-0 z-30 flex justify-center px-4 transition-[bottom] duration-300",
        raised ? "bottom-28" : "bottom-6",
      )}
    >
      <div className="pressroom-artifact-reveal w-full max-w-xl rounded-2xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur">
        {/* Reference + persona row */}
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {bookName} {chapterNumber} · verse {currentVerse}
            {audio.verseCount > 0 && ` of ${audio.verseCount}`}
          </span>
          <VoicePicker audio={audio}>
            <button
              type="button"
              className="tactile inline-flex h-7 items-center gap-1.5 rounded-full border border-accent/50 bg-accent/10 px-2.5 font-display text-xs font-semibold text-foreground hover:bg-accent/20"
            >
              {audio.persona.name}
            </button>
          </VoicePicker>
          <button
            type="button"
            onClick={audio.stop}
            aria-label="Stop listening"
            className="tactile inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Verse scrubber */}
        <div
          role="slider"
          aria-label="Chapter position"
          aria-valuemin={1}
          aria-valuemax={Math.max(1, audio.verseCount)}
          aria-valuenow={currentVerse}
          tabIndex={0}
          onClick={seekFromPointer}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") { e.preventDefault(); audio.stepVerse(1); }
            if (e.key === "ArrowLeft") { e.preventDefault(); audio.stepVerse(-1); }
          }}
          className="group relative mt-2.5 h-4 cursor-pointer"
        >
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300"
              style={{ width: `${Math.min(100, progress * 100)}%` }}
            />
          </div>
          {scrubTicks.map((left) => (
            <span
              key={left}
              className="absolute top-1/2 h-1 w-px -translate-y-1/2 bg-background/70"
              style={{ left: `${left}%` }}
              aria-hidden
            />
          ))}
        </div>

        {/* Transport row */}
        <div className="mt-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {/* Speed */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="tactile inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 font-mono text-[11px] text-muted-foreground hover:border-accent/60 hover:text-foreground"
                  aria-label="Playback speed"
                >
                  <Gauge className="h-3.5 w-3.5" />
                  {audio.speed}×
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start">
                <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-widest">Speed</DropdownMenuLabel>
                {SPEEDS.map((s) => (
                  <DropdownMenuItem key={s} onClick={() => audio.setSpeed(s)} className={cn(s === audio.speed && "text-accent")}>
                    {s}×
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Sleep timer */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Sleep timer"
                  className={cn(
                    "tactile inline-flex h-8 w-8 items-center justify-center rounded-lg border",
                    audio.sleep !== "off"
                      ? "border-accent/60 bg-accent/15 text-foreground"
                      : "border-border text-muted-foreground hover:border-accent/60 hover:text-foreground",
                  )}
                >
                  <MoonStar className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start">
                <DropdownMenuLabel className="font-mono text-[10px] uppercase tracking-widest">Stop reading</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(Object.keys(SLEEP_LABELS) as SleepSetting[]).map((k) => (
                  <DropdownMenuItem key={k} onClick={() => audio.setSleep(k)} className={cn(k === audio.sleep && "text-accent")}>
                    {SLEEP_LABELS[k]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => audio.stepVerse(-1)}
              aria-label="Previous verse"
              className="tactile inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:border-accent/60 hover:text-foreground"
            >
              <SkipBack className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => { haptics.tap(); audio.toggle(); }}
              aria-label={audio.status === "playing" ? "Pause" : "Play"}
              className="tactile inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md"
            >
              {audio.status === "playing" ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => audio.stepVerse(1)}
              aria-label="Next verse"
              className="tactile inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:border-accent/60 hover:text-foreground"
            >
              <SkipForward className="h-3.5 w-3.5" />
            </button>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => audio.setAutoAdvance(!audio.autoAdvance)}
                aria-pressed={audio.autoAdvance}
                aria-label="Continue into the next chapter"
                className={cn(
                  "tactile inline-flex h-8 items-center gap-1 rounded-lg border px-2 text-[11px]",
                  audio.autoAdvance
                    ? "border-accent/60 bg-accent/15 text-foreground"
                    : "border-border text-muted-foreground hover:border-accent/60 hover:text-foreground",
                )}
              >
                <ChevronsRight className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Continue</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Keep reading into the next chapter
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
