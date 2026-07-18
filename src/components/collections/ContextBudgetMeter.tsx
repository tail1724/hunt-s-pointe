import { CONTEXT_CHAR_CAP } from "@/lib/collections/types";
import { cn } from "@/lib/utils";

interface Props {
  totalChars: number;
}

export function ContextBudgetMeter({ totalChars }: Props) {
  const pct = Math.min(100, Math.round((totalChars / CONTEXT_CHAR_CAP) * 100));
  const over = totalChars > CONTEXT_CHAR_CAP;
  const near = !over && pct >= 80;

  return (
    <div className="rounded-xl border border-border bg-card/70 p-3.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">Context budget</span>
        <span className={cn("tabular-nums", over ? "font-medium text-destructive" : near ? "font-medium text-accent" : "text-muted-foreground")}>
          {totalChars.toLocaleString()} / {CONTEXT_CHAR_CAP.toLocaleString()} chars · {pct}%
        </span>
      </div>
      <div
        className="relative mt-2 h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Context budget used"
      >
        {/* 80% threshold tick */}
        <span aria-hidden className="absolute left-[80%] top-0 h-full w-px bg-border" />
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 [transition-timing-function:var(--ease-tactile)]",
            over ? "bg-destructive" : near ? "bg-accent" : "bg-gradient-to-r from-primary to-accent",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={cn("mt-1.5 text-[11px]", over ? "text-destructive" : "text-muted-foreground")}>
        {over
          ? "Over budget — lowest-priority items will be trimmed when injected."
          : near
            ? "Getting close — PressRoom and Write inject everything under the cap."
            : "Everything here rides along when this collection is active in PressRoom or Write."}
      </p>
    </div>
  );
}
