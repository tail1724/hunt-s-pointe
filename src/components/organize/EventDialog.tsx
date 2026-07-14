import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { OrgEvent } from "@/lib/organize/types";
import { ORGANIZE_COLORS } from "@/lib/organize/types";
import { useDeleteEvent, useSaveEvent } from "@/lib/organize/queries";

export interface EventDraft {
  event?: OrgEvent;
  /** For new events: the day that was clicked. */
  day?: Date;
}

interface Props {
  draft: EventDraft | null;
  onClose: () => void;
}

/** Create/edit a native calendar event. */
export function EventDialog({ draft, onClose }: Props) {
  const saveEvent = useSaveEvent();
  const deleteEvent = useDeleteEvent();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [allDay, setAllDay] = useState(false);
  const [color, setColor] = useState("gold");

  useEffect(() => {
    if (!draft) return;
    const e = draft.event;
    if (e) {
      setTitle(e.title);
      setDescription(e.description ?? "");
      setDate(format(new Date(e.starts_at), "yyyy-MM-dd"));
      setStart(format(new Date(e.starts_at), "HH:mm"));
      setEnd(format(new Date(e.ends_at), "HH:mm"));
      setAllDay(e.all_day);
      setColor(e.color);
    } else {
      setTitle("");
      setDescription("");
      setDate(format(draft.day ?? new Date(), "yyyy-MM-dd"));
      setStart("09:00");
      setEnd("10:00");
      setAllDay(false);
      setColor("gold");
    }
  }, [draft]);

  if (!draft) return null;

  const submit = async () => {
    const t = title.trim();
    if (!t || !date) {
      toast.error("Give the event a title");
      return;
    }
    const startsAt = new Date(`${date}T${allDay ? "00:00" : start}:00`);
    let endsAt = new Date(`${date}T${allDay ? "23:59" : end}:00`);
    if (endsAt <= startsAt) endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
    try {
      await saveEvent.mutateAsync({
        id: draft.event?.id,
        title: t,
        description: description.trim() || null,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        all_day: allDay,
        color,
      });
      onClose();
    } catch {
      toast.error("Couldn't save the event");
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {draft.event ? "Edit event" : "New event"}
          </DialogTitle>
        </DialogHeader>

        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Event title"
          aria-label="Event title"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 font-display text-base font-semibold outline-none focus:border-accent"
        />

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Date"
            className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-accent"
          />
          {!allDay && (
            <>
              <input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                aria-label="Starts"
                className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-accent"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                aria-label="Ends"
                className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-accent"
              />
            </>
          )}
          <label className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="h-3.5 w-3.5 accent-[hsl(40_49%_53%)]"
            />
            All day
          </label>
        </div>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Notes…"
          rows={2}
          aria-label="Event notes"
          className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />

        <div className="flex items-center gap-1" role="group" aria-label="Event color">
          {Object.entries(ORGANIZE_COLORS).map(([key, c]) => (
            <button
              key={key}
              type="button"
              onClick={() => setColor(key)}
              aria-label={c.label}
              style={{ background: c.swatch }}
              className={cn(
                "tactile h-5 w-5 rounded-full border border-border/60",
                color === key && "ring-2 ring-accent ring-offset-1 ring-offset-background",
              )}
            />
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3">
          {draft.event ? (
            <button
              type="button"
              onClick={() => {
                deleteEvent.mutate(draft.event!.id);
                onClose();
              }}
              className="tactile inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          ) : <span />}
          <button
            type="button"
            onClick={submit}
            className="tactile rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
          >
            {draft.event ? "Save" : "Add event"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
