import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Pencil, Sparkles, Palette } from "lucide-react";

export type ExpandMode = "literal" | "creative" | "stylized";

interface SmartExpandToggleProps {
  value: ExpandMode;
  onChange: (value: ExpandMode) => void;
}

export function SmartExpandToggle({ value, onChange }: SmartExpandToggleProps) {
  return (
    <div className="space-y-2">
      <label className="font-display text-sm font-semibold text-foreground">Smart-Expand</label>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(v) => v && onChange(v as ExpandMode)}
        className="justify-start"
      >
        <ToggleGroupItem value="literal" className="gap-1.5 rounded-lg text-xs data-[state=on]:bg-accent data-[state=on]:text-accent-foreground">
          <Pencil className="h-3.5 w-3.5" /> Literal
        </ToggleGroupItem>
        <ToggleGroupItem value="creative" className="gap-1.5 rounded-lg text-xs data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground">
          <Sparkles className="h-3.5 w-3.5" /> Creative
        </ToggleGroupItem>
        <ToggleGroupItem value="stylized" className="gap-1.5 rounded-lg text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
          <Palette className="h-3.5 w-3.5" /> Stylized
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
