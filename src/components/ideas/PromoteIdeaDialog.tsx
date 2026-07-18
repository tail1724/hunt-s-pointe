import { useNavigate } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import { useBoards } from "@/lib/organize/queries";
import { usePromoteIdea } from "@/lib/ideas/promote";
import type { IdeaNote } from "@/lib/ideas/store";

interface Props {
  idea: IdeaNote | null;
  onOpenChange: (open: boolean) => void;
  onPromoted: (ideaId: string, dest: { boardId: string; cardId: string }) => void;
}

/** Send a captured idea into an Organize board's first column. */
export function PromoteIdeaDialog({ idea, onOpenChange, onPromoted }: Props) {
  const boards = useBoards();
  const promote = usePromoteIdea();
  const navigate = useNavigate();

  const submit = async (boardId: string) => {
    if (!idea || promote.isPending) return;
    try {
      const dest = await promote.mutateAsync({ idea, boardId });
      haptics.tap();
      onPromoted(idea.id, dest);
      onOpenChange(false);
      toast.success("Idea sent to the board's first column", {
        action: { label: "Open board", onClick: () => navigate(`/app/organize/board/${boardId}`) },
      });
    } catch (e) {
      console.error("Idea promotion failed", e);
      toast.error(e instanceof Error ? `Couldn't promote the idea — ${e.message}` : "Couldn't promote the idea");
    }
  };

  return (
    <Dialog open={!!idea} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Promote to a board</DialogTitle>
          <DialogDescription>
            The idea becomes a card in the board's first column. It stays on your Idea Board, marked as promoted.
          </DialogDescription>
        </DialogHeader>

        {boards.isLoading ? (
          <p className="py-2 text-sm text-muted-foreground">Loading boards…</p>
        ) : (boards.data?.length ?? 0) === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            No boards yet — create one in Organize first.
          </p>
        ) : (
          <div className="grid max-h-72 gap-1.5 overflow-y-auto" role="list">
            {(boards.data ?? []).map((b) => (
              <button
                key={b.id}
                type="button"
                role="listitem"
                disabled={promote.isPending}
                onClick={() => submit(b.id)}
                className="tactile flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-left text-sm font-medium transition-colors hover:border-accent/60 hover:bg-accent/5 disabled:opacity-50"
              >
                <span aria-hidden>{b.emoji ?? "🗂️"}</span>
                <span className="flex-1 truncate">{b.title}</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
