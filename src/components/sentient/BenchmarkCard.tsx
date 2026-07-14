import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown } from "lucide-react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from "recharts";

export interface BenchmarkResult {
  pipe_a: string;
  pipe_b: string;
  robustness_vector: {
    creativity: number;
    precision: number;
    context_density: number;
    compliance: number;
    nuance: number;
  };
  delta_score: number;
  baseline_error?: boolean;
  system_baseline?: number;
}

interface BenchmarkCardProps {
  result: BenchmarkResult;
}

export function BenchmarkCard({ result }: BenchmarkCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { robustness_vector: rv, delta_score, system_baseline } = result;

  const radarData = [
    { metric: "Creativity", value: rv.creativity, fullMark: 100 },
    { metric: "Precision", value: rv.precision, fullMark: 100 },
    { metric: "Context", value: rv.context_density, fullMark: 100 },
    { metric: "Compliance", value: rv.compliance, fullMark: 100 },
    { metric: "Nuance", value: rv.nuance, fullMark: 100 },
  ];

  const avgScore = Math.round(
    (rv.creativity + rv.precision + rv.context_density + rv.compliance + rv.nuance) / 5
  );

  const isPositive = delta_score >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
    >
      <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Robustness Analysis
            </p>
            <div className="flex items-center gap-2">
              {result.baseline_error && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-mono">
                  Baseline Error
                </span>
              )}
              <div className={`flex items-center gap-1 text-xs font-bold ${isPositive ? "text-green-500" : "text-red-500"}`}>
                {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{isPositive ? "+" : ""}{delta_score}</span>
              </div>
            </div>
          </div>

          {/* Radar Chart */}
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }}
                  tickCount={5}
                />
                <Radar
                  name="Robustness"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 10,
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Score + Baseline */}
          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="text-muted-foreground">Avg Score: </span>
              <span className="font-bold text-foreground">{avgScore}</span>
            </div>
            {system_baseline != null && (
              <div>
                <span className="text-muted-foreground">System Baseline: </span>
                <span className="font-bold text-foreground">{system_baseline}</span>
              </div>
            )}
          </div>

          {/* Baseline comparison bar */}
          {system_baseline != null && (
            <div className="relative h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-primary/40"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(system_baseline, 100)}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(avgScore, 100)}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
              />
            </div>
          )}

          {/* Expandable Diff View */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full gap-1.5 text-xs h-7"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? "Hide" : "Show"} Pipe Comparison
          </Button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-[9px] font-semibold text-muted-foreground uppercase mb-1">
                      Pipe A — Raw Seed
                    </p>
                    <p className="text-xs text-foreground whitespace-pre-wrap line-clamp-6">
                      {result.pipe_a}
                    </p>
                  </div>
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <p className="text-[9px] font-semibold text-primary uppercase mb-1">
                      Pipe B — Optimized
                    </p>
                    <p className="text-xs text-foreground whitespace-pre-wrap line-clamp-6">
                      {result.pipe_b}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
