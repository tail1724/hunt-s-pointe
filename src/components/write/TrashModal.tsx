import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
  ResponsiveDialogDescription as DialogDescription,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Trash2, RotateCcw, Sparkles, FileText, FlameKindling, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TrashRow {
  id: string;
  title: string;
  content_text: string;
  deleted_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void; // refetch library + count
}

const RETENTION_DAYS = 30;

function daysLeft(deletedAt: string): number {
  const ms = new Date(deletedAt).getTime() + RETENTION_DAYS * 86_400_000 - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

function CountdownRing({ days }: { days: number }) {
  const pct = Math.min(1, Math.max(0, days / RETENTION_DAYS));
  const r = 14;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);
  const tone =
    days <= 2 ? "text-destructive" : days <= 7 ? "text-accent" : "text-primary";
  return (
    <div className={cn("relative inline-flex h-9 w-9 items-center justify-center", tone)}>
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r={r} className="fill-none stroke-border" strokeWidth="2.5" />
        <circle
          cx="18" cy="18" r={r}
          className="fill-none stroke-current transition-all duration-500 ease-out"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="text-[10px] font-semibold tabular-nums">{days}d</span>
    </div>
  );
}

export function TrashModal({ open, onOpenChange, onChanged }: Props) {
  const { user } = useAuth();
  const [rows, setRows] = useState<TrashRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("documents" as any)
      .select("id, title, content_text, deleted_at")
      .eq("user_id", user.id)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });
    if (error) toast.error("Couldn't load trash");
    setRows(((data as any[]) || []) as TrashRow[]);
    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      setConfirmEmpty(false);
      setRemovingIds(new Set());
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  const animateOut = (id: string) =>
    new Promise<void>((resolve) => {
      setRemovingIds((prev) => new Set(prev).add(id));
      window.setTimeout(resolve, 320);
    });

  const restore = async (row: TrashRow) => {
    if (!user) return;
    setBusyId(row.id);
    await animateOut(row.id);
    const { error } = await supabase
      .from("documents" as any)
      .update({ deleted_at: null } as any)
      .eq("id", row.id)
      .eq("user_id", user.id);
    setBusyId(null);
    if (error) {
      toast.error("Couldn't restore");
      setRemovingIds((prev) => { const n = new Set(prev); n.delete(row.id); return n; });
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    toast.success(`Welcome back, ${row.title || "Untitled Document"}`, {
      icon: <Sparkles className="h-4 w-4" />,
    });
    onChanged();
  };

  const deleteForever = async (row: TrashRow) => {
    if (!user) return;
    setBusyId(row.id);
    await animateOut(row.id);
    const { error } = await supabase
      .from("documents" as any)
      .delete()
      .eq("id", row.id)
      .eq("user_id", user.id);
    setBusyId(null);
    if (error) {
      toast.error("Couldn't delete");
      setRemovingIds((prev) => { const n = new Set(prev); n.delete(row.id); return n; });
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    toast.success("Gone for good.");
    onChanged();
  };

  const emptyTrash = async () => {
    if (!user || rows.length === 0) return;
    setBusyId("__all__");
    const ids = rows.map((r) => r.id);
    setRemovingIds(new Set(ids));
    await new Promise((r) => setTimeout(r, 360));
    const { error } = await supabase
      .from("documents" as any)
      .delete()
      .eq("user_id", user.id)
      .not("deleted_at", "is", null);
    setBusyId(null);
    if (error) {
      toast.error("Couldn't empty trash");
      setRemovingIds(new Set());
      return;
    }
    setRows([]);
    setConfirmEmpty(false);
    toast.success("Trash emptied. Fresh start.");
    onChanged();
  };

  const count = rows.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-2xl p-0 overflow-hidden border-border/60",
          "rounded-2xl shadow-[0_40px_80px_-30px_hsl(222_50%_8%/0.45)]",
          "data-[state=open]:animate-in data-[state=open]:zoom-in-95 data-[state=open]:fade-in-0",
          "data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=closed]:fade-out-0",
          "duration-300",
        )}
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60 bg-gradient-to-b from-muted/40 to-transparent">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="font-display text-lg font-extrabold tracking-tight">
                  Trash
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Items live here for {RETENTION_DAYS} days before they're gone forever.
                </DialogDescription>
              </div>
            </div>
            {count > 0 && !confirmEmpty && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmEmpty(true)}
                className="gap-1.5 text-muted-foreground hover:text-destructive"
              >
                <FlameKindling className="h-3.5 w-3.5" /> Empty trash
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Empty-trash confirm bar */}
        <div
          className={cn(
            "grid transition-all duration-300 ease-out",
            confirmEmpty ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="overflow-hidden">
            <div className="mx-6 mt-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 flex items-center gap-3">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              <div className="text-xs flex-1">
                <span className="font-semibold text-foreground">Empty {count} {count === 1 ? "item" : "items"}?</span>
                <span className="text-muted-foreground"> This cannot be undone.</span>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setConfirmEmpty(false)} className="h-7">Cancel</Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={emptyTrash}
                disabled={busyId === "__all__"}
                className="h-7"
              >
                Empty
              </Button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto px-3 py-3">
          {loading ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="relative px-6 py-14 text-center overflow-hidden">
              <div aria-hidden className="pointer-events-none absolute inset-0">
                {[...Array(6)].map((_, i) => (
                  <span
                    key={i}
                    className="absolute h-1.5 w-1.5 rounded-full bg-accent/40 motion-safe:animate-pulse"
                    style={{
                      left: `${15 + i * 12}%`,
                      top: `${20 + (i % 3) * 25}%`,
                      animationDelay: `${i * 220}ms`,
                      animationDuration: `${2400 + i * 200}ms`,
                    }}
                  />
                ))}
              </div>
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="font-display text-base font-bold">Squeaky clean</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Nothing in trash. Deleted documents will appear here.
              </p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {rows.map((row, i) => {
                const days = daysLeft(row.deleted_at);
                const removing = removingIds.has(row.id);
                const snippet = (row.content_text || "").slice(0, 90);
                return (
                  <li
                    key={row.id}
                    style={{ animationDelay: removing ? "0ms" : `${Math.min(i, 10) * 40}ms` }}
                    className={cn(
                      "group rounded-xl border border-border/60 bg-card px-3 py-2.5",
                      "flex items-center gap-3 transition-all duration-300 ease-out",
                      "hover:border-accent/40 hover:shadow-[0_8px_24px_-12px_hsl(222_50%_8%/0.25)]",
                      removing
                        ? "opacity-0 -translate-y-1 scale-[0.98] max-h-0 my-0 py-0 border-transparent"
                        : "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1",
                    )}
                  >
                    <CountdownRing days={days} />
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-display text-sm font-semibold text-foreground">
                        {row.title || "Untitled Document"}
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {snippet || <em>Empty document</em>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => restore(row)}
                        disabled={busyId === row.id}
                        className="h-8 gap-1.5 px-2.5 text-xs hover:text-primary"
                        aria-label="Restore"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteForever(row)}
                        disabled={busyId === row.id}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        aria-label="Delete forever"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/60 px-6 py-3 bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{count} {count === 1 ? "item" : "items"} in trash</span>
          <span>Auto-purge after {RETENTION_DAYS} days</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
