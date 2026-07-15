import { formatDistanceToNowStrict } from "date-fns";
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
  ResponsiveDialogDescription as DialogDescription,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { History, RotateCcw, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocumentVersion } from "@/lib/annotations/types";
import { useDocumentVersions } from "@/lib/annotations/useDocumentVersions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versions: ReturnType<typeof useDocumentVersions>;
  onRestore: (version: DocumentVersion) => void;
}

/**
 * The attributed timeline (base plan §7, addendum feature 6): every save is
 * "human," every applied margin suggestion is "ai_suggestion" with the one-
 * line summary the annotation carried. This is what makes the editor's
 * final authority provable, not just asserted.
 */
export function HistoryDrawer({ open, onOpenChange, versions, onRestore }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" /> Document history
          </DialogTitle>
          <DialogDescription>
            Every version, attributed. AI-suggested changes only appear here after you applied them.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-2 overflow-y-auto py-1">
          {versions.loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/40" />)}
            </div>
          ) : versions.versions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No saved versions yet.</p>
          ) : (
            versions.versions.map((v) => (
              <div
                key={v.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border px-3 py-2.5",
                  v.author_kind === "human" ? "border-border/60 bg-card/60" : "border-ai/25 bg-ai-wash/10",
                )}
              >
                <span className={cn(
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                  v.author_kind === "human" ? "bg-muted text-muted-foreground" : "bg-ai/15 text-ai",
                )}>
                  {v.author_kind === "human" ? <User className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground">
                    {v.author_kind === "human" ? "You edited" : "PressRoom suggestion applied"}
                  </p>
                  {v.change_summary && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{v.change_summary}</p>
                  )}
                  <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                    {formatDistanceToNowStrict(new Date(v.created_at))} ago
                  </p>
                </div>
                <Button size="sm" variant="ghost" className="h-7 shrink-0 gap-1 text-xs" onClick={() => onRestore(v)}>
                  <RotateCcw className="h-3 w-3" /> Restore
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
