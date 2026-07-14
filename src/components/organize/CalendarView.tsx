import { useMemo, useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import {
  addDays, addMonths, addWeeks, differenceInCalendarDays, eachDayOfInterval, endOfMonth,
  endOfWeek, format, isSameDay, isSameMonth, isToday, startOfDay, startOfMonth, startOfWeek,
} from "date-fns";
import { CalendarClock, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { haptics } from "@/lib/haptics";
import { playTick } from "@/lib/voice/ui-sound";
import { cn } from "@/lib/utils";
import type { BoardBundle, Card, OrgEvent } from "@/lib/organize/types";
import { colorSwatch } from "@/lib/organize/types";
import { useEvents, useSaveEvent, useUpdateCard } from "@/lib/organize/queries";
import { duePillClass } from "./CardItem";
import { EventDialog, type EventDraft } from "./EventDialog";

type CalView = "month" | "week" | "agenda";

interface Props {
  bundle: BoardBundle;
  matched: Set<string> | null;
  onOpenCard: (card: Card) => void;
}

interface DayItem {
  key: string;
  kind: "card" | "event";
  card?: Card;
  event?: OrgEvent;
  time: number;
}

const dayId = (d: Date) => `day:${format(d, "yyyy-MM-dd")}`;
const MAX_MONTH_ITEMS = 3;

/** Month / Week / Agenda over card due dates + native events, drag to reschedule. */
export function CalendarView({ bundle, matched, onOpenCard }: Props) {
  const [view, setView] = useState<CalView>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [dragging, setDragging] = useState<DayItem | null>(null);

  const events = useEvents();
  const updateCard = useUpdateCard(bundle.board.id);
  const saveEvent = useSaveEvent();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const itemsByDay = useMemo(() => {
    const map = new Map<string, DayItem[]>();
    const push = (d: Date, item: DayItem) => {
      const k = format(d, "yyyy-MM-dd");
      map.set(k, [...(map.get(k) ?? []), item]);
    };
    for (const card of bundle.cards) {
      if (!card.due_at) continue;
      const d = new Date(card.due_at);
      push(d, { key: `card:${card.id}`, kind: "card", card, time: card.all_day ? 0 : d.getTime() });
    }
    for (const event of events.data ?? []) {
      const d = new Date(event.starts_at);
      push(d, { key: `event:${event.id}`, kind: "event", event, time: event.all_day ? 0 : d.getTime() });
    }
    for (const list of map.values()) list.sort((a, z) => a.time - z.time);
    return map;
  }, [bundle.cards, events.data]);

  const range = useMemo(() => {
    if (view === "month") {
      const start = startOfWeek(startOfMonth(cursor));
      const end = endOfWeek(endOfMonth(cursor));
      return eachDayOfInterval({ start, end });
    }
    if (view === "week") {
      return eachDayOfInterval({ start: startOfWeek(cursor), end: endOfWeek(cursor) });
    }
    return eachDayOfInterval({ start: startOfDay(new Date()), end: addDays(new Date(), 45) });
  }, [view, cursor]);

  const stepCursor = (dir: 1 | -1) =>
    setCursor((c) => (view === "month" ? addMonths(c, dir) : addWeeks(c, dir)));

  const onDragStart = ({ active }: DragStartEvent) => {
    haptics.tap();
    const [kind, id] = String(active.id).split(":");
    const list = [...itemsByDay.values()].flat();
    setDragging(list.find((i) => i.key === `${kind}:${id}`) ?? null);
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const item = dragging;
    setDragging(null);
    if (!item || !over || !String(over.id).startsWith("day:")) return;
    const day = new Date(`${String(over.id).slice(4)}T12:00:00`);

    if (item.kind === "card" && item.card?.due_at) {
      const prev = new Date(item.card.due_at);
      const next = new Date(day);
      next.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
      if (!isSameDay(prev, next)) {
        updateCard.mutate({ id: item.card.id, due_at: next.toISOString() });
        playTick();
      }
    }
    if (item.kind === "event" && item.event) {
      const delta = differenceInCalendarDays(day, new Date(item.event.starts_at));
      if (delta !== 0) {
        saveEvent.mutate({
          id: item.event.id,
          title: item.event.title,
          starts_at: addDays(new Date(item.event.starts_at), delta).toISOString(),
          ends_at: addDays(new Date(item.event.ends_at), delta).toISOString(),
          all_day: item.event.all_day,
          color: item.event.color,
        });
        playTick();
      }
    }
  };

  const headerLabel =
    view === "month"
      ? format(cursor, "MMMM yyyy")
      : view === "week"
        ? `${format(startOfWeek(cursor), "MMM d")} – ${format(endOfWeek(cursor), "MMM d, yyyy")}`
        : "Next 45 days";

  return (
    <div className="flex h-full min-h-0 flex-col px-4 pb-6 md:px-6">
      {/* Calendar chrome — the chapter-heading voice */}
      <div className="flex flex-wrap items-center gap-2 pb-3 pt-1">
        <h2 className="flex items-baseline gap-3 font-display text-xl font-semibold tracking-tight">
          {headerLabel}
          <span className="hidden h-px w-10 self-center bg-accent/50 sm:block" aria-hidden />
        </h2>
        {view !== "agenda" && (
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => stepCursor(-1)} aria-label="Previous" className="tactile rounded-lg border border-border p-1.5 text-muted-foreground hover:border-accent/60 hover:text-foreground">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => setCursor(new Date())} className="tactile rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground hover:border-accent/60 hover:text-foreground">
              Today
            </button>
            <button type="button" onClick={() => stepCursor(1)} aria-label="Next" className="tactile rounded-lg border border-border p-1.5 text-muted-foreground hover:border-accent/60 hover:text-foreground">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <div role="tablist" aria-label="Calendar view" className="inline-flex rounded-lg border border-border bg-card p-0.5">
            {(["month", "week", "agenda"] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={cn(
                  "tactile rounded-md px-2.5 py-1 text-xs capitalize",
                  view === v ? "bg-accent/15 text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setDraft({ day: new Date() })}
            className="tactile inline-flex items-center gap-1.5 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Event
          </button>
        </div>
      </div>

      {view === "agenda" ? (
        <AgendaList days={range} itemsByDay={itemsByDay} matched={matched} onOpenCard={onOpenCard} onOpenEvent={(e) => setDraft({ event: e })} />
      ) : (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
          <div className="grid grid-cols-7 gap-px pb-1 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {range.slice(0, 7).map((d) => (
              <div key={d.toISOString()}>{format(d, "EEE")}</div>
            ))}
          </div>
          <div
            className={cn(
              "organize-panel grid min-h-0 flex-1 grid-cols-7 gap-px overflow-y-auto overflow-x-clip bg-border/60 p-px",
              view === "week" && "auto-rows-fr",
            )}
          >
            {range.map((day) => (
              <DayCell
                key={day.toISOString()}
                day={day}
                inMonth={view === "week" || isSameMonth(day, cursor)}
                compact={view === "month"}
                items={itemsByDay.get(format(day, "yyyy-MM-dd")) ?? []}
                matched={matched}
                onOpenCard={onOpenCard}
                onOpenEvent={(e) => setDraft({ event: e })}
                onCreate={() => setDraft({ day })}
              />
            ))}
          </div>
          <DragOverlay>
            {dragging && (
              <div className="pointer-events-none">
                <ItemChip item={dragging} matched={null} overlay />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <EventDialog draft={draft} onClose={() => setDraft(null)} />
    </div>
  );
}

// ------------------------------------------------------------------- cells

interface DayCellProps {
  day: Date;
  inMonth: boolean;
  compact: boolean;
  items: DayItem[];
  matched: Set<string> | null;
  onOpenCard: (card: Card) => void;
  onOpenEvent: (event: OrgEvent) => void;
  onCreate: () => void;
}

function DayCell({ day, inMonth, compact, items, matched, onOpenCard, onOpenEvent, onCreate }: DayCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id: dayId(day) });
  const visible = compact ? items.slice(0, MAX_MONTH_ITEMS) : items;
  const hidden = items.length - visible.length;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group relative flex min-h-24 flex-col gap-1 bg-background p-1.5 transition-colors",
        !inMonth && "bg-muted/40 text-muted-foreground",
        isOver && "bg-accent/10",
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "inline-flex h-5 w-5 items-center justify-center rounded-full font-mono text-[11px]",
            isToday(day) && "bg-accent text-background font-semibold",
          )}
        >
          {format(day, "d")}
        </span>
        <button
          type="button"
          onClick={onCreate}
          aria-label={`Add event on ${format(day, "MMMM d")}`}
          className="tactile rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
      {visible.map((item) => (
        <DraggableChip key={item.key} item={item} matched={matched} onOpenCard={onOpenCard} onOpenEvent={onOpenEvent} />
      ))}
      {hidden > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="tactile self-start rounded px-1 text-[10px] text-muted-foreground hover:text-foreground">
              +{hidden} more
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 space-y-1 p-2">
            <p className="px-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {format(day, "EEEE, MMM d")}
            </p>
            {items.map((item) => (
              <ItemChip key={item.key} item={item} matched={matched} onOpenCard={onOpenCard} onOpenEvent={onOpenEvent} />
            ))}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

function DraggableChip(props: {
  item: DayItem;
  matched: Set<string> | null;
  onOpenCard: (card: Card) => void;
  onOpenEvent: (event: OrgEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: props.item.key,
  });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={cn(isDragging && "opacity-40")}>
      <ItemChip {...props} />
    </div>
  );
}

function ItemChip({
  item, matched, overlay, onOpenCard, onOpenEvent,
}: {
  item: DayItem;
  matched: Set<string> | null;
  overlay?: boolean;
  onOpenCard?: (card: Card) => void;
  onOpenEvent?: (event: OrgEvent) => void;
}) {
  if (item.kind === "card" && item.card) {
    const card = item.card;
    const dimmed = matched !== null && !matched.has(card.id);
    return (
      <button
        type="button"
        onClick={() => onOpenCard?.(card)}
        className={cn(
          "tactile flex w-full items-center gap-1 truncate rounded-md border px-1.5 py-0.5 text-left text-[11px]",
          duePillClass(card),
          "bg-card",
          dimmed && "opacity-35",
          overlay && "shadow-lg",
        )}
        title={card.title}
      >
        <CalendarClock className="h-2.5 w-2.5 shrink-0" aria-hidden />
        <span className="truncate">{card.title}</span>
      </button>
    );
  }
  const event = item.event!;
  return (
    <button
      type="button"
      onClick={() => onOpenEvent?.(event)}
      className={cn(
        "tactile flex w-full items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-left text-[11px] text-background",
        overlay && "shadow-lg",
      )}
      style={{ background: colorSwatch(event.color) }}
      title={event.title}
    >
      {!event.all_day && <span className="font-mono text-[9px] opacity-80">{format(new Date(event.starts_at), "HH:mm")}</span>}
      <span className="truncate font-medium">{event.title}</span>
    </button>
  );
}

// ------------------------------------------------------------------ agenda

function AgendaList({
  days, itemsByDay, matched, onOpenCard, onOpenEvent,
}: {
  days: Date[];
  itemsByDay: Map<string, DayItem[]>;
  matched: Set<string> | null;
  onOpenCard: (card: Card) => void;
  onOpenEvent: (event: OrgEvent) => void;
}) {
  const withItems = days.filter((d) => (itemsByDay.get(format(d, "yyyy-MM-dd")) ?? []).length > 0);
  if (withItems.length === 0) {
    return (
      <p className="mt-12 text-center text-sm text-muted-foreground">
        Nothing scheduled ahead. Add an event or give a card a due date.
      </p>
    );
  }
  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
      {withItems.map((day) => {
        const items = itemsByDay.get(format(day, "yyyy-MM-dd")) ?? [];
        return (
          <section key={day.toISOString()} className="flex gap-3">
            <div className="w-14 shrink-0 text-right">
              <p className={cn("font-display text-lg font-semibold", isToday(day) && "text-accent")}>
                {format(day, "d")}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {format(day, "EEE MMM")}
              </p>
            </div>
            <div className="flex-1 space-y-1 border-l border-border pl-3">
              {items.map((item) => (
                <ItemChip key={item.key} item={item} matched={matched} onOpenCard={onOpenCard} onOpenEvent={onOpenEvent} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
