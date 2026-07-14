import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { FolderOpen, Plus, FileText, Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import { DocumentPickerOverlay } from "./DocumentPickerOverlay";
import { toast } from "sonner";

interface RecentDoc {
  id: string;
  title: string;
  updated_at: string;
}

interface Props {
  currentId?: string;
  hidden?: boolean;
}

export function DocumentSwitcherBar({ currentId, hidden }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recent, setRecent] = useState<RecentDoc[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadRecent = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("documents" as any)
      .select("id, title, updated_at")
      .eq("user_id", user.id)
      .is("archived_at", null)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(6);
    setRecent(((data as any) as RecentDoc[]) || []);
  }, [user]);

  useEffect(() => { loadRecent(); }, [loadRecent, currentId]);

  // Keyboard shortcuts: Cmd/Ctrl+O opens picker, Cmd/Ctrl+Shift+N creates blank.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && !e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        setPickerOpen(true);
      }
      if (meta && e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        createBlank();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const createBlank = async () => {
    if (!user || creating) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("documents" as any)
      .insert({
        user_id: user.id,
        title: "Untitled Document",
        content: { type: "doc", content: [{ type: "paragraph" }] },
        content_text: "",
        source: "manual",
      } as any)
      .select("id")
      .single();
    setCreating(false);
    if (error || !data) { toast.error("Couldn't create document"); return; }
    navigate(`/app/write/${(data as any).id}`);
  };

  if (hidden) return null;

  return (
    <>
      <DocumentPickerOverlay open={pickerOpen} onOpenChange={setPickerOpen} currentId={currentId} />
      <div
        className={cn(
          "sticky top-0 z-30 px-4 md:px-6 py-2 flex items-center gap-3",
          "backdrop-blur-xl bg-card/55 border-b border-border/40",
          "print:hidden",
        )}
      >
        {/* Recent chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex-1 min-w-0">
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70 shrink-0 hidden sm:inline">
            Recent
          </span>
          {recent.length === 0 ? (
            <span className="text-xs text-muted-foreground/60">No documents yet</span>
          ) : (
            recent.map((d) => {
              const active = d.id === currentId;
              return (
                <Link
                  key={d.id}
                  to={`/app/write/${d.id}`}
                  className={cn(
                    "shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs",
                    "border transition-all max-w-[180px]",
                    active
                      ? "bg-primary/10 border-primary/30 text-foreground shadow-[inset_0_-2px_0_hsl(var(--accent))]"
                      : "bg-background/40 border-border/40 text-muted-foreground hover:text-foreground hover:bg-background/70",
                  )}
                  title={d.title || "Untitled Document"}
                >
                  <FileText className="h-3 w-3 shrink-0 opacity-70" />
                  <span className="truncate">{d.title || "Untitled Document"}</span>
                </Link>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setPickerOpen(true)}
          >
            <FolderOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Open from File Cabinet</span>
            <span className="sm:hidden">Open</span>
            <kbd className="hidden md:inline ml-1 text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/40">⌘O</kbd>
          </Button>
          <Button asChild variant="ghost" size="sm" className="h-8 gap-1.5 text-xs hidden md:inline-flex">
            <Link to="/app/file-cabinet">
              <Archive className="h-3.5 w-3.5" />
              File Cabinet
            </Link>
          </Button>
          <div className="w-px h-5 bg-border/50 mx-1" />
          <Button
            variant="default"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={createBlank}
            disabled={creating}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New blank</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </div>
    </>
  );
}
