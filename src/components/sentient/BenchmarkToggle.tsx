import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBenchmarkPreferences } from "@/hooks/useBenchmarkPreferences";

const COOLDOWN_OPTIONS = [
  { label: "30s", value: 30 },
  { label: "90s", value: 90 },
  { label: "5 min", value: 300 },
];

export function BenchmarkToggle() {
  const { prefs, update } = useBenchmarkPreferences();
  const label = prefs.enabled
    ? `Bench ${prefs.cooldown_sec >= 60 ? `${Math.round(prefs.cooldown_sec / 60)}m` : `${prefs.cooldown_sec}s`}`
    : "Bench off";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={prefs.enabled ? "default" : "outline"}
          size="sm"
          className="gap-1.5 text-xs"
          aria-label="Benchmark settings"
        >
          <Activity className="h-3.5 w-3.5" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Inference Benchmark</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => update({ enabled: !prefs.enabled })}>
          {prefs.enabled ? "Turn off" : "Turn on"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] text-muted-foreground">Cooldown</DropdownMenuLabel>
        {COOLDOWN_OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => update({ cooldown_sec: opt.value, enabled: true })}
            className={prefs.cooldown_sec === opt.value ? "bg-accent" : ""}
          >
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
