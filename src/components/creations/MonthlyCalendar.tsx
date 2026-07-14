import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
} from "date-fns";
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

interface MonthlyCalendarProps {
  generations: Generation[];
  onSelect: (gen: Generation) => void;
  onReschedule?: (genId: string, date: string, timeSlot: string | null) => void;
}

const MAX_VISIBLE = 3;

function DraggableThumb({ gen, onSelect }: { gen: Generation; onSelect: (g: Generation) => void }) {
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
      className={`w-7 h-7 sm:w-8 sm:h-8 rounded border border-border overflow-hidden bg-muted hover:ring-2 hover:ring-ring transition-shadow flex-shrink-0 touch-none ${isDragging ? "opacity-30" : ""}`}
    >
      {gen.result_url ? (
        <img src={gen.result_url} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="text-[7px] text-muted-foreground flex items-center justify-center h-full">
          {gen.status}
        </span>
      )}
    </button>
  );
}

function DroppableDay({
  cellId,
  children,
  isOver,
  isCurrentMonth,
  isToday,
  day,
}: {
  cellId: string;
  children: React.ReactNode;
  isOver: boolean;
  isCurrentMonth: boolean;
  isToday: boolean;
  day: Date;
}) {
  const { setNodeRef } = useDroppable({ id: cellId });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[60px] sm:min-h-[80px] p-1 sm:p-1.5 border-b border-r border-border transition-colors ${
        isOver ? "ring-2 ring-ring bg-accent/30" : ""
      } ${!isCurrentMonth ? "bg-muted/40" : "bg-card"}`}
    >
      <span
        className={`text-xs font-medium block mb-1 ${
          isToday
            ? "bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center"
            : !isCurrentMonth
            ? "text-muted-foreground/50"
            : "text-foreground"
        }`}
      >
        {format(day, "d")}
      </span>
      <div className="flex flex-wrap gap-0.5">{children}</div>
    </div>
  );
}

export function MonthlyCalendar({ generations, onSelect, onReschedule }: MonthlyCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [activeGen, setActiveGen] = useState<Generation | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let d = calStart;
  while (d <= calEnd) {
    days.push(d);
    d = addDays(d, 1);
  }

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const scheduled = generations.filter((g) => g.scheduled_date);
  const today = new Date();

  const getItemsForDay = (day: Date) =>
    scheduled.filter((g) => isSameDay(new Date(g.scheduled_date + "T00:00:00"), day));

  const makeCellId = (day: Date) => `mcell::${format(day, "yyyy-MM-dd")}`;

  const parseCellId = (id: string) => {
    const parts = id.split("::");
    if (parts[0] !== "mcell") return null;
    return parts[1];
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveGen((event.active.data.current as any)?.generation ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveGen(null);
    setOverId(null);
    if (!event.over || !onReschedule) return;
    const date = parseCellId(event.over.id as string);
    if (!date) return;
    const gen = (event.active.data.current as any)?.generation as Generation | undefined;
    onReschedule(event.active.id as string, date, gen?.scheduled_time_slot ?? null);
  };

  const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="space-y-3">
      {/* Month navigation */}
      <div className="flex items-center justify-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth((m) => subMonths(m, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-foreground min-w-[140px] text-center">
          {format(currentMonth, "MMMM yyyy")}
        </span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth((m) => addMonths(m, 1))}>
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
        <div className="min-w-[560px] border border-border rounded-lg overflow-hidden">
          {/* Weekday header */}
          <div className="grid grid-cols-7 bg-muted">
            {WEEKDAYS.map((wd) => (
              <div key={wd} className="p-2 text-center text-xs font-medium text-muted-foreground border-r border-border last:border-r-0">
                {wd}
              </div>
            ))}
          </div>

          {/* Week rows */}
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7">
              {week.map((day) => {
                const cellId = makeCellId(day);
                const items = getItemsForDay(day);
                const visible = items.slice(0, MAX_VISIBLE);
                const overflow = items.length - MAX_VISIBLE;

                return (
                  <DroppableDay
                    key={cellId}
                    cellId={cellId}
                    isOver={overId === cellId}
                    isCurrentMonth={isSameMonth(day, currentMonth)}
                    isToday={isSameDay(day, today)}
                    day={day}
                  >
                    {visible.map((gen) => (
                      <DraggableThumb key={gen.id} gen={gen} onSelect={onSelect} />
                    ))}
                    {overflow > 0 && (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0 h-5">
                        +{overflow}
                      </Badge>
                    )}
                  </DroppableDay>
                );
              })}
            </div>
          ))}
        </div>
        </div>

        <DragOverlay>
          {activeGen && (
            <div className="w-8 h-8 rounded border border-ring overflow-hidden bg-muted shadow-lg">
              {activeGen.result_url ? (
                <img src={activeGen.result_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[7px] text-muted-foreground flex items-center justify-center h-full">
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
