import { Slider } from "@/components/ui/slider";

interface GranularitySliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function GranularitySlider({ value, onChange }: GranularitySliderProps) {
  return (
    <div className="space-y-2">
      <label className="font-display text-sm font-semibold text-foreground">Granularity</label>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={0}
        max={100}
        step={1}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Minimalist</span>
        <span>Maximalist</span>
      </div>
    </div>
  );
}
