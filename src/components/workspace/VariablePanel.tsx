import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Lock, Sparkles } from "lucide-react";

interface VariablePanelProps {
  seed: string;
  variables: Record<string, string>;
  onChange: (variables: Record<string, string>) => void;
  onReinject: () => void;
  hasOutput: boolean;
  consistencyMode: "rigid" | "fluid";
  onConsistencyModeChange: (mode: "rigid" | "fluid") => void;
}

export function VariablePanel({ seed, variables, onChange, onReinject, hasOutput, consistencyMode, onConsistencyModeChange }: VariablePanelProps) {
  const varNames = Array.from(seed.matchAll(/\{\{(\w+)\}\}/g)).map((m) => m[1]);
  const uniqueVars = [...new Set(varNames)];

  if (uniqueVars.length === 0) return null;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="space-y-2">
        <label className="font-display text-sm font-semibold text-foreground">Variables</label>
        <div className="flex flex-wrap items-center gap-2">
          {/* Consistency Toggle */}
          <div className="flex items-center rounded-md border border-border bg-muted p-0.5 text-xs">
            <button
              onClick={() => onConsistencyModeChange("rigid")}
              className={`flex items-center gap-1 rounded px-2 py-1 font-medium transition-colors ${
                consistencyMode === "rigid"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Lock className="h-3 w-3" />
              Rigid
            </button>
            <button
              onClick={() => onConsistencyModeChange("fluid")}
              className={`flex items-center gap-1 rounded px-2 py-1 font-medium transition-colors ${
                consistencyMode === "fluid"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="h-3 w-3" />
              Fluid
            </button>
          </div>
          {hasOutput && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReinject}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className="h-3 w-3" /> Re-inject
            </Button>
          )}
        </div>
      </div>
      <div className="space-y-2">
        {uniqueVars.map((name) => (
          <div key={name} className="flex items-center gap-2">
            <Badge variant="outline" className="shrink-0 border-accent text-accent text-xs">
              {`{{${name}}}`}
            </Badge>
            <Input
              placeholder={`Value for ${name}...`}
              value={variables[name] || ""}
              onChange={(e) => onChange({ ...variables, [name]: e.target.value })}
              className="h-8 text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
