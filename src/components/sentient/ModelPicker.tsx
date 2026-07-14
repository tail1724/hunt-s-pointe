import { Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { SENTIENT_MODELS, type SentientModelId } from "@/hooks/useModelPreference";

interface Props {
  model: SentientModelId;
  onChange: (m: SentientModelId) => void;
}

export function ModelPicker({ model, onChange }: Props) {
  const current = SENTIENT_MODELS.find((m) => m.id === model) ?? SENTIENT_MODELS[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" aria-label="Choose model">
          <Cpu className="h-3 w-3" />
          {current.label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Model</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SENTIENT_MODELS.map((m) => (
          <DropdownMenuItem key={m.id} onClick={() => onChange(m.id)} className={m.id === model ? "bg-accent" : ""}>
            <div className="flex flex-col">
              <span className="text-sm">{m.label}</span>
              <span className="text-[10px] text-muted-foreground">{m.hint}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
