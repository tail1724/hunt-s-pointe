import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { useCreateBoard } from "@/lib/organize/queries";

const EMOJI_CHOICES = ["🗂️", "📖", "✝️", "🕊️", "📅", "✍️", "🎨", "🌱"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Navigate to the created board. */
  onCreated: (boardId: string) => void;
}

/** Designed board creation: name + emoji, starter columns seeded. */
export function BoardDialog({ open, onOpenChange, onCreated }: Props) {
  const createBoard = useCreateBoard();
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState(EMOJI_CHOICES[0]);

  useEffect(() => {
    if (open) {
      setTitle("");
      setEmoji(EMOJI_CHOICES[0]);
    }
  }, [open]);

  const submit = async () => {
    const t = title.trim();
    if (!t || createBoard.isPending) return;
    try {
      const board = await createBoard.mutateAsync({ title: t, emoji });
      haptics.tap();
      onOpenChange(false);
      onCreated(board.id);
    } catch (e) {
      console.error("Board creation failed", e);
      toast.error(e instanceof Error ? `Couldn't create the board — ${e.message}` : "Couldn't create the board");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">New board</DialogTitle>
          <DialogDescription>
            It starts with Ideas, In progress, Ready, and Done — rename or add columns anytime.
          </DialogDescription>
        </DialogHeader>

        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Sermon pipeline, VBS planning…"
          aria-label="Board name"
          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-base outline-none transition-colors focus:border-accent"
        />

        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Board emoji">
          {EMOJI_CHOICES.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              aria-pressed={emoji === e}
              aria-label={`Emoji ${e}`}
              className={cn(
                "tactile flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition-colors",
                emoji === e
                  ? "border-accent/70 bg-accent/15"
                  : "border-border hover:border-accent/50",
              )}
            >
              {e}
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="tactile rounded-lg border border-border px-3.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!title.trim() || createBoard.isPending}
            className={cn(
              "tactile rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground",
              (!title.trim() || createBoard.isPending) && "opacity-50",
            )}
          >
            {createBoard.isPending ? "Creating…" : "Create board"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
