import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from "date-fns";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { Tables } from "@/integrations/supabase/types";

type Generation = Tables<"generations">;

const TIME_SLOTS = [
  { label: "Early AM", value: "early_morning" },
  { label: "Morning", value: "morning" },
  { label: "Lunch", value: "lunch" },
  { label: "Afternoon", value: "afternoon" },
  { label: "Evening", value: "evening" },
  { label: "Night", value: "night" },
  { label: "Late Night", value: "late_night" },
  { label: "Unslotted", value: "__unslotted__" },
] as const;

interface WeeklyCalendarProps {
  generations: Generation[];
  onSelect: (gen: Generation) => void;
  onReschedule?: (genId: string, date: string, timeSlot: string | null) => void;
}

function DraggableThumbnail({ gen, onSelect }: { gen: Generation; onSelect: (g: Generation) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: gen.id,
    data: { generation: gen },
  });

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onSelect(gen)}
      className={`w-9 h-9 sm:w-10 sm:h-10 rounded border border-border overflow-hidden bg-muted hover:ring-2 hover:ring-ring transition-shadow flex-shrink-0 touch-none ${isDragging ? "opacity-30" : ""}`}
    >
      {gen.result_url ? (
        <img src={gen.result_url} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="text-[8px] text-muted-foreground flex items-center justify-center h-full">
          {gen.status}
        </span>
      )}
    </button>
  );
}

function DroppableCell({
  cellId,
  children,
  isOver,
}: {
  cellId: string;
  children: React.ReactNode;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: cellId });

  return (
    <div
      ref={setNodeRef}
      className={`bg-card p-1 min-h-[52px] flex flex-wrap gap-1 transition-colors ${isOver ? "ring-2 ring-ring bg-accent/30" : ""}`}
    >
      {children}
    </div>
  );
}

export function WeeklyCalendar({ generations, onSelect, onReschedule }: WeeklyCalendarProps) {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [activeGen, setActiveGen] = useState<Generation | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const scheduled = generations.filter((g) => g.scheduled_date);

  const getCell = (dayDate: Date, slotValue: string) => {
    return scheduled.filter((g) => {
      const genDate = new Date(g.scheduled_date + "T00:00:00");
      if (!isSameDay(genDate, dayDate)) return false;
      if (slotValue === "__unslotted__") return !g.scheduled_time_slot;
      return g.scheduled_time_slot === slotValue;
    });
  };

  const makeCellId = (dayIso: string, slotValue: string) => `cell::${dayIso}::${slotValue}`;

  const parseCellId = (id: string) => {
    const parts = id.split("::");
    if (parts[0] !== "cell") return null;
    return { date: parts[1], timeSlot: parts[2] === "__unslotted__" ? null : parts[2] };
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveGen((event.active.data.current as any)?.generation ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveGen(null);
    setOverId(null);
    if (!event.over || !onReschedule) return;
    const target = parseCellId(event.over.id as string);
    if (!target) return;
    onReschedule(event.active.id as string, target.date, target.timeSlot);
  };

  return (
    <div className="space-y-3">
      {/* Week navigation */}
      <div className="flex items-center justify-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekStart((w) => subWeeks(w, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-foreground">
          {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
        </span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekStart((w) => addWeeks(w, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Grid */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={(e) => setOverId((e.over?.id as string) ?? null)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => { setActiveGen(null); setOverId(null); }}
      >
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            {/* Header row */}
            <div className="grid grid-cols-[100px_repeat(7,1fr)] gap-px bg-border rounded-t-lg overflow-hidden">
              <div className="bg-muted p-2 text-xs font-medium text-muted-foreground" />
              {days.map((d) => (
                <div key={d.toISOString()} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">
                  <span className="block">{format(d, "EEE")}</span>
                  <span className="block text-foreground font-semibold">{format(d, "d")}</span>
                </div>
              ))}
            </div>

            {/* Slot rows */}
            {TIME_SLOTS.map((slot) => (
              <div key={slot.value} className="grid grid-cols-[100px_repeat(7,1fr)] gap-px bg-border">
                <div className="bg-card p-2 flex items-center">
                  <span className="text-[11px] font-medium text-muted-foreground leading-tight">{slot.label}</span>
                </div>
                {days.map((d) => {
                  const dayIso = format(d, "yyyy-MM-dd");
                  const cellId = makeCellId(dayIso, slot.value);
                  const items = getCell(d, slot.value);
                  return (
                    <DroppableCell key={cellId} cellId={cellId} isOver={overId === cellId}>
                      {items.map((gen) => (
                        <DraggableThumbnail key={gen.id} gen={gen} onSelect={onSelect} />
                      ))}
                    </DroppableCell>
                  );
                })}
              </div>
            ))}

            <div className="h-px bg-border rounded-b-lg" />
          </div>
        </div>

        <DragOverlay>
          {activeGen && (
            <div className="w-10 h-10 rounded border border-ring overflow-hidden bg-muted shadow-lg">
              {activeGen.result_url ? (
                <img src={activeGen.result_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[8px] text-muted-foreground flex items-center justify-center h-full">
                  {activeGen.status}
                </span>
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
