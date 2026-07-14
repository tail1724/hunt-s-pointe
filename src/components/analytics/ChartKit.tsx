import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { compactNumber } from "@/lib/analytics/chart-theme";
import type { ChartTheme } from "@/lib/analytics/chart-theme";

/* ------------------------------------------------------------------ */
/* Stat tile — label · value · optional delta vs a named period        */
/* ------------------------------------------------------------------ */

interface StatTileProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  /** Signed change vs the named period; omit when not computable */
  delta?: number;
  deltaLabel?: string;
  /** Whether an increase is a good thing (colors the delta) */
  upIsGood?: boolean;
  hint?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function StatTile({
  label,
  value,
  icon: Icon,
  delta,
  deltaLabel = "vs prior 30 days",
  upIsGood = true,
  hint,
  className,
  style,
}: StatTileProps) {
  const display = typeof value === "number" ? compactNumber(value) : value;
  const hasDelta = typeof delta === "number" && delta !== 0;
  const positive = (delta ?? 0) > 0;
  const good = hasDelta && positive === upIsGood;

  return (
    <div
      style={style}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-card p-4",
        "shadow-[var(--shadow-card)] card-elevate",
        className,
      )}
    >
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/70 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-display text-2xl font-bold leading-none text-foreground">{display}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {hasDelta && (
        <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium",
              good ? "text-[hsl(150_60%_32%)] dark:text-[hsl(150_55%_55%)]" : "text-destructive",
            )}
          >
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {positive ? "+" : ""}
            {delta!.toLocaleString()}
          </span>
          {deltaLabel}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Chart card — consistent framing for every plot                      */
/* ------------------------------------------------------------------ */

interface ChartCardProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function ChartCard({ title, subtitle, action, children, className }: ChartCardProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-1">
        <div>
          <h3 className="font-display text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className="px-3 pb-4 pt-2">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Recharts tooltip styled to the design system                        */
/* ------------------------------------------------------------------ */

interface TooltipRow {
  name?: string;
  value?: number | string;
  color?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  label?: string;
  payload?: TooltipRow[];
  theme: ChartTheme;
  formatValue?: (v: number | string) => string;
}

export function ChartTooltip({ active, label, payload, theme, formatValue }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((r) => r.value !== undefined && r.value !== 0);
  if (!rows.length) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-lg"
      style={{
        background: theme.tooltip.background,
        border: `1px solid ${theme.tooltip.border}`,
        color: theme.tooltip.text,
      }}
    >
      {label && (
        <p className="mb-1 font-medium" style={{ color: theme.tooltip.muted }}>
          {label}
        </p>
      )}
      <div className="space-y-1">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-1.5">
              {r.color && (
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-[3px]"
                  style={{ background: r.color }}
                />
              )}
              {r.name}
            </span>
            <span className="font-semibold tabular-nums">
              {formatValue ? formatValue(r.value!) : r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state for a chart or list                                     */
/* ------------------------------------------------------------------ */

interface VizEmptyProps {
  icon: LucideIcon;
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}

export function VizEmpty({ icon: Icon, title, body, action, className }: VizEmptyProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-10 text-center", className)}>
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted/70">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </span>
      <p className="mt-3 text-sm font-medium text-foreground">{title}</p>
      {body && <p className="mt-1 max-w-xs text-xs text-muted-foreground">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
