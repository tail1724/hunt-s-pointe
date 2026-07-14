import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Columns2, X } from "lucide-react";

interface OutputDiffViewerProps {
  seed: string;
  output: string;
}

export function OutputDiffViewer({ seed, output }: OutputDiffViewerProps) {
  const [open, setOpen] = useState(false);

  if (!output) return null;

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className="gap-1.5 text-xs"
      >
        {open ? <X className="h-3.5 w-3.5" /> : <Columns2 className="h-3.5 w-3.5" />}
        {open ? "Close Diff" : "View Diff"}
      </Button>
      {open && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border border-border p-3">
          <div className="space-y-1.5">
            <h4 className="font-display text-xs font-semibold text-muted-foreground">Original Seed</h4>
            <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground leading-relaxed">
              {seed}
            </div>
          </div>
          <div className="space-y-1.5">
            <h4 className="font-display text-xs font-semibold text-foreground">Processed Output</h4>
            <div className="rounded-md bg-card border border-border p-3 text-sm text-foreground leading-relaxed">
              {highlightOutput(seed, output)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function highlightOutput(seed: string, output: string) {
  const seedWords = new Set(
    seed.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter((w) => w.length > 3)
  );

  const words = output.split(/(\s+)/);
  return (
    <span>
      {words.map((word, i) => {
        if (/^\s+$/.test(word)) return word;
        const clean = word.toLowerCase().replace(/[^\w]/g, "");
        // Creative additions — SaaS flag style (mono, muted)
        if (clean.length > 3 && !seedWords.has(clean)) {
          return (
            <span key={i} className="font-mono text-accent/70">
              {word}
            </span>
          );
        }
        return word;
      })}
    </span>
  );
}
