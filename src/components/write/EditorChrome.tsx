import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  Check, Loader2, AlertCircle, Download, Copy, Printer,
  Eye, EyeOff, ChevronLeft, Save, History,
} from "lucide-react";
import type { SaveStatus } from "@/hooks/useAutosave";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  status: SaveStatus;
  savedAt: Date | null;
  contentText: string;
  contentMarkdown?: string;
  wordCount: number;
  focusMode: boolean;
  onSave?: () => void | Promise<void>;
  onToggleFocus: () => void;
  onBack: () => void;
  onOpenHistory?: () => void;
}

function relativeTime(d: Date | null) {
  if (!d) return "";
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function EditorChrome({
  title, status, savedAt, contentText, contentMarkdown,
  wordCount, focusMode, onSave, onToggleFocus, onBack, onOpenHistory,
}: Props) {
  const exportText = (ext: "md" | "txt") => {
    const body = ext === "md" ? (contentMarkdown ?? contentText) : contentText;
    const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safe = (title || "document").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    a.href = url; a.download = `${safe}.${ext}`; a.click();
    URL.revokeObjectURL(url);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(contentText);
    toast.success("Copied to clipboard");
  };

  const minutes = Math.max(1, Math.round(wordCount / 220));

  const [edgeHover, setEdgeHover] = useState(false);
  const leaveTimer = useRef<number | null>(null);
  const scheduleCollapse = () => {
    if (leaveTimer.current) window.clearTimeout(leaveTimer.current);
    leaveTimer.current = window.setTimeout(() => setEdgeHover(false), 600);
  };
  const cancelCollapse = () => {
    if (leaveTimer.current) { window.clearTimeout(leaveTimer.current); leaveTimer.current = null; }
  };
  useEffect(() => () => { if (leaveTimer.current) window.clearTimeout(leaveTimer.current); }, []);

  const headerHidden = focusMode && !edgeHover;

  return (
    <>
      {/* Always-available exit affordance while in focus mode */}
      {focusMode && (
        <button
          type="button"
          onClick={onToggleFocus}
          title="Exit focus mode (Esc)"
          aria-label="Exit focus mode"
          // Below md this clears the mobile shell's 44px status bar (+
          // safe-area) instead of sitting underneath it; md+ keeps the
          // original tight corner placement since there's no status bar there.
          className="fixed top-[calc(44px+env(safe-area-inset-top,0px)+0.5rem)] md:top-3 right-3 z-50 print:hidden inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium bg-card/85 backdrop-blur-md border border-border/60 shadow-sm text-foreground/90 hover:text-foreground hover:bg-card transition-all animate-in fade-in duration-300"
        >
          <EyeOff className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Exit focus</span>
        </button>
      )}

      {/* Top-edge hover zone re-reveals the header in focus mode (desktop only) */}
      {focusMode && (
        <div
          aria-hidden
          onMouseEnter={() => { cancelCollapse(); setEdgeHover(true); }}
          className="hidden md:block fixed top-0 left-0 right-0 h-2 z-40 print:hidden"
        />
      )}

      <header
        onMouseEnter={cancelCollapse}
        onMouseLeave={focusMode ? scheduleCollapse : undefined}
        className={cn(
          "sticky top-0 z-30 flex flex-col print:hidden transition-all duration-300 ease-out",
          headerHidden
            ? "opacity-0 -translate-y-2 pointer-events-none"
            : "opacity-100 translate-y-0"
        )}
      >
      {/* Top bar */}
      <div className="flex items-center gap-2 h-11 px-4 md:px-6 bg-card/80 backdrop-blur-md border-b border-border/50">
        <button
          type="button"
          onClick={onBack}
          className="group inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          All documents
        </button>
        <span className="text-xs text-muted-foreground/50 mx-1">/</span>
        <span className="text-xs text-muted-foreground truncate max-w-[40ch]">
          {title || "Untitled Document"}
        </span>

        <div className="ml-auto flex items-center gap-1">
          {onSave && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSave()}
              title="Save now (⌘S)"
              aria-label="Save now"
              className={cn(
                "h-8 gap-1.5 text-xs transition-colors",
                status === "saved" && "text-accent",
                status === "error" && "text-destructive",
                (status === "idle" || status === "saved") && "opacity-80 hover:opacity-100",
              )}
            >
              {status === "saving" ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> <span className="hidden sm:inline">Saving</span></>
              ) : status === "saved" ? (
                <><Check className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Saved</span></>
              ) : (
                <><Save className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Save</span></>
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={onToggleFocus}
            title={focusMode ? "Exit focus mode" : "Enter focus mode"}
          >
            {focusMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{focusMode ? "Exit focus" : "Focus"}</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={copy}>
            <Copy className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Copy</span>
          </Button>
          {onOpenHistory && (
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={onOpenHistory} title="Document history">
              <History className="h-3.5 w-3.5" /> <span className="hidden sm:inline">History</span>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => window.print()}>
                <Printer className="h-3.5 w-3.5 mr-2" /> Print preview
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => exportText("md")}>Markdown (.md)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportText("txt")}>Plain text (.txt)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Status ribbon */}
      <div className="relative flex items-center h-7 px-4 md:px-6 bg-card/60 backdrop-blur-sm border-b border-border/40 text-[11px] text-muted-foreground">
        <span
          aria-hidden
          className={cn(
            "absolute left-0 top-0 bottom-0 w-[3px] transition-all duration-300",
            status === "saving" ? "bg-accent/70" :
            status === "saved" ? "bg-accent saved-pulse" :
            status === "error" ? "bg-destructive" :
            status === "dirty" ? "bg-muted-foreground/30" : "bg-transparent"
          )}
          key={savedAt?.getTime() ?? 0}
        />
        <div className="inline-flex items-center gap-1.5">
          {status === "saving" && (<><Loader2 className="h-3 w-3 animate-spin" /> Saving…</>)}
          {status === "saved" && (<><Check className="h-3 w-3 text-accent" /> Saved · {relativeTime(savedAt)}</>)}
          {status === "error" && (<><AlertCircle className="h-3 w-3 text-destructive" /> Save failed — will retry</>)}
          {status === "dirty" && (<>Unsaved changes</>)}
          {status === "idle" && savedAt && (<>Saved · {relativeTime(savedAt)}</>)}
          {!savedAt && status === "idle" && (<>Draft</>)}
        </div>
        <div className="ml-auto tabular-nums">
          {wordCount.toLocaleString()} {wordCount === 1 ? "word" : "words"} · {minutes} min read
        </div>
      </div>
    </header>
    </>
  );
}
