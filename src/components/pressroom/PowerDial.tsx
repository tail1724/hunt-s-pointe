import { Gauge, Rabbit, BookOpenText, Zap, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { formatCredits } from "@/lib/credit-schedule";
import { usePowerLevel } from "@/hooks/usePowerLevel";

/**
 * The PressRoom power dial — replaces raw model selection. Members pick how hard
 * PressRoom thinks (Speed ↔ Depth, 8 stops), a power level (1–5), and Turbo, and
 * watch the per-message credit cost respond. It reads as a small instrument
 * panel, not a settings form.
 */
export function PowerDial() {
  const { depth, power, turbo, setDepth, setPower, setTurbo, estCredits } = usePowerLevel();

  const depthLabel = depth <= 2 ? "Speed" : depth >= 7 ? "Depth" : depth <= 4 ? "Balanced" : "Deeper";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 rounded-full px-2.5 text-xs pressroom-tactile"
          aria-label={`Power: ${depthLabel} ${depth}, level ${power}${turbo ? ", turbo" : ""}`}
        >
          <Gauge className="h-3.5 w-3.5" />
          <span className="tabular-nums">{depthLabel} · P{power}</span>
          {turbo && <Zap className="h-3 w-3 text-[hsl(40_56%_55%)]" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[280px] p-4">
        {/* Speed ↔ Depth */}
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Rabbit className="h-3.5 w-3.5" /> Speed</span>
            <span className="inline-flex items-center gap-1">Depth <BookOpenText className="h-3.5 w-3.5" /></span>
          </div>
          <Slider
            value={[depth]}
            min={1}
            max={8}
            step={1}
            onValueChange={([v]) => setDepth(v)}
            aria-label="Speed to Depth"
          />
          <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
            {depthLabel} · stop {depth} of 8
          </p>
        </div>

        {/* Power 1–5 */}
        <div className="mb-4">
          <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">Power level</div>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setPower(lvl)}
                aria-label={`Power level ${lvl}`}
                aria-pressed={power === lvl}
                className={cn(
                  "h-8 flex-1 rounded-md border text-xs font-semibold tabular-nums transition-colors",
                  power >= lvl
                    ? "border-transparent bg-[hsl(40_56%_51%/0.9)] text-[hsl(210_40%_12%)]"
                    : "border-border bg-transparent text-muted-foreground hover:bg-muted",
                )}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Turbo */}
        <button
          type="button"
          onClick={() => setTurbo(!turbo)}
          aria-pressed={turbo}
          className={cn(
            "mb-4 flex w-full items-center justify-between rounded-lg border px-3 py-2 transition-colors",
            turbo ? "border-[hsl(40_56%_51%)] bg-[hsl(40_56%_51%/0.12)]" : "border-border hover:bg-muted",
          )}
        >
          <span className="inline-flex items-center gap-2 text-sm font-medium">
            <Zap className={cn("h-4 w-4", turbo ? "text-[hsl(40_56%_55%)]" : "text-muted-foreground")} />
            Turbo
          </span>
          <span className={cn(
            "relative h-5 w-9 rounded-full transition-colors",
            turbo ? "bg-[hsl(40_56%_51%)]" : "bg-muted",
          )}>
            <span className={cn(
              "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all",
              turbo ? "left-[18px]" : "left-0.5",
            )} />
          </span>
        </button>

        {/* Live credit estimate — the economics loop */}
        <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-xs">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Coins className="h-3.5 w-3.5" /> Per message
          </span>
          <span className="font-semibold tabular-nums text-foreground">≈ {formatCredits(estCredits)} {estCredits === 1 ? "credit" : "credits"}</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
