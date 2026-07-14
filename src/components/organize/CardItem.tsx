import { forwardRef } from "react";
import { CalendarClock, CheckCircle2, FileText, ImageIcon, Library, MessagesSquare } from "lucide-react";
import { format, isBefore, differenceInCalendarDays } from "date-fns";
import { cn } from "@/lib/utils";
import type { Card, CardLink, OrganizeTag } from "@/lib/organize/types";
import { colorSwatch, parseChecklist, type LinkKind } from "@/lib/organize/types";

export const LINK_ICONS: Record<LinkKind, React.ComponentType<{ className?: string }>> = {
  document: FileText,
  collection: Library,
  generation: ImageIcon,
  session: MessagesSquare,
};

interface Props {
  card: Card;
  links: CardLink[];
  tags: OrganizeTag[];
  dimmed?: boolean;
  dragging?: boolean;
  overlay?: boolean;
  onOpen?: (card: Card) => void;
  style?: React.CSSProperties;
  attributes?: React.HTMLAttributes<HTMLDivElement>;
  listeners?: React.HTMLAttributes<HTMLDivElement>;
}

export function duePillClass(card: Card): string {
  if (card.completed_at) return "border-border text-muted-foreground line-through";
  if (!card.due_at) return "border-border text-muted-foreground";
  const due = new Date(card.due_at);
  const now = new Date();
  if (isBefore(due, now) && differenceInCalendarDays(now, due) > 0)
    return "border-red-400/50 bg-red-400/10 text-red-500 dark:text-red-400";
  if (differenceInCalendarDays(due, now) <= 3)
    return "border-amber-400/50 bg-amber-400/10 text-amber-600 dark:text-amber-400";
  return "border-border text-muted-foreground";
}

/** One board card: cover tint, title, tags, due, checklist ring, link badges. */
export const CardItem = forwardRef<HTMLDivElement, Props>(function CardItem(
  { card, links, tags, dimmed, dragging, overlay, onOpen, style, attributes, listeners },
  ref,
) {
  const checklist = parseChecklist(card.checklist);
  const done = checklist.filter((i) => i.done).length;

  return (
    <div
      ref={ref}
      style={style}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(card)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen?.(card);
      }}
      className={cn(
        "tactile group relative cursor-grab rounded-xl border border-border bg-card p-3 text-left shadow-sm outline-none transition-[opacity,box-shadow,transform] focus-visible:ring-2 focus-visible:ring-accent",
        overlay && "rotate-2 scale-[1.03] cursor-grabbing shadow-xl",
        dragging && "opacity-40",
        dimmed && "opacity-35",
      )}
    >
      {card.cover_color && (
        <span
          className="absolute inset-x-3 top-0 h-1 rounded-b-full"
          style={{ background: colorSwatch(card.cover_color) }}
          aria-hidden
        />
      )}
      <p className={cn("font-medium leading-snug", card.completed_at && "text-muted-foreground line-through")}>
        {card.completed_at && <CheckCircle2 className="mr-1 inline h-3.5 w-3.5 text-accent" aria-hidden />}
        {card.title}
      </p>

      {tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {tags.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1 rounded-full border border-border/70 px-1.5 py-px text-[10px] text-muted-foreground"
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: colorSwatch(t.color) }} aria-hidden />
              {t.name}
            </span>
          ))}
        </div>
      )}

      {(card.due_at || checklist.length > 0 || links.length > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {card.due_at && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-1.5 py-px font-mono text-[10px]",
                duePillClass(card),
              )}
            >
              <CalendarClock className="h-3 w-3" aria-hidden />
              {format(new Date(card.due_at), "MMM d")}
            </span>
          )}
          {checklist.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md border border-border px-1.5 py-px font-mono text-[10px] text-muted-foreground">
              <span
                className={cn("h-1.5 w-1.5 rounded-full", done === checklist.length ? "bg-accent" : "bg-muted-foreground/50")}
                aria-hidden
              />
              {done}/{checklist.length}
            </span>
          )}
          {links.map((l) => {
            const Icon = LINK_ICONS[l.kind as LinkKind] ?? FileText;
            return (
              <span
                key={l.id}
                title={l.title}
                className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-border text-muted-foreground"
              >
                <Icon className="h-3 w-3" />
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
});
