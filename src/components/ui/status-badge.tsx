import { forwardRef, type HTMLAttributes } from "react";
import {
  Bot, CalendarClock, CheckCircle2, CircleDashed, Eye, Globe2, PenLine, TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Quantum Newsroom workflow states (PRD §5). One meaning per token, shared
 * verbatim with the Payload Admin. Every badge renders a text label plus an
 * icon (non-color cue) — color is never the only signal.
 */
export type WorkflowStatus =
  | "draft"
  | "review"
  | "approved"
  | "scheduled"
  | "published"
  | "ai"
  | "human"
  | "warning";

export const WORKFLOW_STATUS_META: Record<
  WorkflowStatus,
  { label: string; icon: LucideIcon; description: string }
> = {
  draft: { label: "Draft", icon: CircleDashed, description: "Incomplete, neutral, safe to revise" },
  review: { label: "In review", icon: Eye, description: "Editorial attention or response required" },
  approved: { label: "Approved", icon: CheckCircle2, description: "Cleared internally, not necessarily public" },
  scheduled: { label: "Scheduled", icon: CalendarClock, description: "Queued for time-based publication" },
  published: { label: "Published", icon: Globe2, description: "Public and successfully delivered" },
  ai: { label: "AI-generated", icon: Bot, description: "Machine-created or materially transformed" },
  human: { label: "Human-edited", icon: PenLine, description: "Human editorial judgment applied" },
  warning: { label: "Needs attention", icon: TriangleAlert, description: "Risk, validation failure, or required intervention" },
};

interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status: WorkflowStatus;
  /** Override the default state label (label text always stays visible). */
  label?: string;
  /** Hide the icon when space is critical — the dot rail still renders. */
  hideIcon?: boolean;
}

/**
 * Badge treatment per PRD §5: low-opacity tint of the state color as the
 * background; full state value for the dot, icon, and label.
 */
export const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, label, hideIcon, className, ...rest }, ref) => {
    const meta = WORKFLOW_STATUS_META[status];
    const Icon = meta.icon;
    return (
      <span
        ref={ref}
        title={meta.description}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide",
          className,
        )}
        style={{
          color: `hsl(var(--qn-status-${status}))`,
          borderColor: `hsl(var(--qn-status-${status}) / 0.35)`,
          background: `hsl(var(--qn-status-${status}) / 0.12)`,
        }}
        {...rest}
      >
        {!hideIcon && <Icon className="h-3 w-3 shrink-0" aria-hidden />}
        <span
          aria-hidden
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: `hsl(var(--qn-status-${status}))` }}
        />
        {label ?? meta.label}
      </span>
    );
  },
);
StatusBadge.displayName = "StatusBadge";
