import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const TIME_SLOTS = [
  { label: "Early Morning", value: "early_morning" },
  { label: "Morning", value: "morning" },
  { label: "Lunch", value: "lunch" },
  { label: "Afternoon", value: "afternoon" },
  { label: "Evening", value: "evening" },
  { label: "Night", value: "night" },
  { label: "Late Night", value: "late_night" },
] as const;

interface BulkScheduleBarProps {
  count: number;
  onSchedule: (date: string, timeSlot: string | null) => void;
  onClear: () => void;
}

export function BulkScheduleBar({ count, onSchedule, onClear }: BulkScheduleBarProps) {
  const [date, setDate] = useState<Date | undefined>();
  const [timeSlot, setTimeSlot] = useState<string>("__none__");

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {count} selected
          </Badge>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn("justify-start text-left font-normal flex-1 sm:flex-none", !date && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                {date ? format(date, "MMM d, yyyy") : "Pick date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start" side="top">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          <Select value={timeSlot} onValueChange={setTimeSlot}>
            <SelectTrigger className="w-[120px] sm:w-[140px] h-9 text-sm">
              <SelectValue placeholder="Time slot" />
            </SelectTrigger>
            <SelectContent side="top">
              <SelectItem value="__none__">No time</SelectItem>
              {TIME_SLOTS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="ghost" size="icon" className="h-8 w-8 sm:hidden" onClick={onClear}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            disabled={!date}
            className="flex-1 sm:flex-none"
            onClick={() => {
              if (!date) return;
              onSchedule(format(date, "yyyy-MM-dd"), timeSlot === "__none__" ? null : timeSlot);
            }}
          >
            Schedule All
          </Button>

          <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:flex ml-auto" onClick={onClear}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
