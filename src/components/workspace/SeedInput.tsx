import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { vertical } from "@/config/vertical";

interface SeedInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function SeedInput({ value, onChange }: SeedInputProps) {
  // Extract {{variables}} from the seed
  const variables = Array.from(value.matchAll(/\{\{(\w+)\}\}/g)).map(m => m[1]);

  return (
    <div className="space-y-3">
      <label className="font-display text-sm font-semibold text-foreground">
        1. Plant Your Seed
      </label>
      <Textarea
        placeholder={vertical.seedPlaceholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[100px] resize-none rounded-lg border-border bg-card font-sans text-base placeholder:text-muted-foreground focus-visible:ring-ring"
      />
      {variables.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground">Variables:</span>
          {variables.map((v, i) => (
            <Badge key={i} variant="outline" className="border-accent text-accent text-xs">
              {`{{${v}}}`}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
