import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowUpRight, Check, Lightbulb, Sparkles, Trash2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { useIsMobile } from "@/hooks/use-mobile";
import { colorSwatch } from "@/lib/organize/types";
import {
  IDEA_CANVAS_HEIGHT, IDEA_CANVAS_WIDTH, IDEA_NOTE_WIDTH,
  nextCapturePosition, useIdeaBoard, type IdeaNote,
} from "@/lib/ideas/store";
import { IdeaStickyNote } from "./IdeaStickyNote";
import { PromoteIdeaDialog } from "./PromoteIdeaDialog";

/**
 * /app/ideas — the brainstorming surface.
 *
 * Desktop: a freeform spatial canvas (AFFiNE-style edgeless board) for
 * arranging, clustering, and fleshing out ideas during creation sessions.
 * Mobile: a capture-first stream — big input on top, newest ideas below —
 * tuned so a thought is saved locally within five seconds (PRD §5.1).
 */
export function IdeaWorkspace() {
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const { ideas, sortedNewestFirst, saveState, addIdea, updateIdea, removeIdea } = useIdeaBoard();
  const [captureText, setCaptureText] = useState("");
  const [promoteTarget, setPromoteTarget] = useState<IdeaNote | null>(null);
  const [justCapturedId, setJustCapturedId] = useState<string | null>(null);
  const captureRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  // /app/ideas?capture=1 — the mobile quick-capture entry point drops the
  // user straight into the input with the keyboard up.
  useEffect(() => {
    if (searchParams.get("capture") === "1") {
      captureRef.current?.focus();
      const next = new URLSearchParams(searchParams);
      next.delete("capture");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const capture = () => {
    const t = captureText.trim();
    if (!t) return;
    const idea = addIdea(t, nextCapturePosition(ideas.length));
    setCaptureText("");
    haptics.tap();
    setJustCapturedId(idea.id);
    window.setTimeout(() => setJustCapturedId((cur) => (cur === idea.id ? null : cur)), 1600);
    captureRef.current?.focus();
  };

  const onCanvasDoubleClick = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scroller = canvasRef.current?.parentElement;
    const x = Math.max(0, Math.min(e.clientX - rect.left - IDEA_NOTE_WIDTH / 2, IDEA_CANVAS_WIDTH - IDEA_NOTE_WIDTH));
    const y = Math.max(0, Math.min(e.clientY - rect.top - 20, IDEA_CANVAS_HEIGHT - 80));
    void scroller;
    addIdea("New idea — double-click to edit", { x, y });
    haptics.tap();
  };

  const promotedCount = useMemo(() => ideas.filter((i) => i.promotedTo).length, [ideas]);

  const captureBar = (
    <form
      onSubmit={(e) => { e.preventDefault(); capture(); }}
      className="flex w-full items-center gap-2"
    >
      <input
        ref={captureRef}
        value={captureText}
        onChange={(e) => setCaptureText(e.target.value)}
        placeholder="Capture an idea — it saves on this device instantly"
        aria-label="Capture an idea"
        enterKeyHint="done"
        className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-card px-3.5 text-base outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary md:h-10 md:text-sm"
      />
      <button
        type="submit"
        disabled={!captureText.trim()}
        className={cn(
          "tactile inline-flex h-11 items-center gap-1.5 rounded-xl px-4 text-sm font-bold md:h-10",
          "bg-signal text-signal-foreground disabled:opacity-40",
        )}
      >
        <Zap className="h-4 w-4" aria-hidden />
        Capture
      </button>
    </form>
  );

  const saveBadge = (
    <span
      className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em]"
      style={{
        color: saveState === "saved" ? "hsl(var(--qn-status-approved))" : "hsl(var(--qn-status-warning))",
      }}
      role="status"
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: saveState === "saved" ? "hsl(var(--signal))" : "hsl(var(--qn-status-warning))" }}
      />
      {saveState === "saved" ? "Saved locally" : "Local save failed — free up storage"}
    </span>
  );

  return (
    <div className="organize-surface flex h-full min-h-0 flex-col">
      <header className="relative z-10 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 md:px-6">
          <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <Lightbulb className="h-3.5 w-3.5 text-accent" aria-hidden />
            Idea Board
          </span>
          <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />
          {saveBadge}
          <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {ideas.length} {ideas.length === 1 ? "idea" : "ideas"}
            {promotedCount > 0 && ` · ${promotedCount} on boards`}
          </span>
        </div>
        <div className="px-4 pb-3 md:px-6">{captureBar}</div>
      </header>

      {isMobile ? (
        /* ---- Mobile: capture-first stream ---- */
        <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-24 pt-3">
          {sortedNewestFirst.length === 0 ? (
            <EmptyState mobile />
          ) : (
            <ul className="grid gap-2.5">
              {sortedNewestFirst.map((idea) => (
                <MobileIdeaRow
                  key={idea.id}
                  idea={idea}
                  highlight={idea.id === justCapturedId}
                  onEdit={(text) => updateIdea(idea.id, { text })}
                  onDelete={() => removeIdea(idea.id)}
                  onPromote={() => setPromoteTarget(idea)}
                />
              ))}
            </ul>
          )}
        </div>
      ) : (
        /* ---- Desktop: freeform spatial canvas ---- */
        <div className="relative z-10 flex-1 overflow-auto">
          <div
            ref={canvasRef}
            role="application"
            aria-label="Idea canvas — double-click empty space to add an idea"
            onDoubleClick={onCanvasDoubleClick}
            className="dot-grid relative"
            style={{ width: IDEA_CANVAS_WIDTH, height: IDEA_CANVAS_HEIGHT }}
          >
            {ideas.length === 0 && <EmptyState />}
            {ideas.map((idea) => (
              <IdeaStickyNote
                key={idea.id}
                idea={idea}
                onMove={(id, x, y) => updateIdea(id, { x, y })}
                onEdit={(id, text) => updateIdea(id, { text })}
                onRecolor={(id, color) => updateIdea(id, { color })}
                onDelete={(id) => removeIdea(id)}
                onPromote={(i) => setPromoteTarget(i)}
              />
            ))}
          </div>
        </div>
      )}

      <PromoteIdeaDialog
        idea={promoteTarget}
        onOpenChange={(open) => { if (!open) setPromoteTarget(null); }}
        onPromoted={(ideaId, dest) => updateIdea(ideaId, { promotedTo: dest })}
      />
    </div>
  );
}

function EmptyState({ mobile }: { mobile?: boolean }) {
  return (
    <div
      className={cn(
        "pointer-events-none flex flex-col items-center gap-2 text-center text-muted-foreground",
        mobile ? "px-6 py-16" : "absolute left-1/2 top-40 w-80 -translate-x-1/2",
      )}
    >
      <Sparkles className="h-6 w-6 text-accent/70" aria-hidden />
      <p className="text-sm font-medium text-foreground/80">Nothing here yet</p>
      <p className="text-xs leading-relaxed">
        {mobile
          ? "Type above and hit Capture — ideas save to this device instantly, then get fleshed out on desktop."
          : "Capture above, or double-click anywhere on the canvas to drop a note. Drag to cluster; promote the keepers to a board."}
      </p>
    </div>
  );
}

function MobileIdeaRow({
  idea, highlight, onEdit, onDelete, onPromote,
}: {
  idea: IdeaNote;
  highlight: boolean;
  onEdit: (text: string) => void;
  onDelete: () => void;
  onPromote: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(idea.text);

  const commit = () => {
    setEditing(false);
    const t = draft.trim();
    if (t && t !== idea.text) onEdit(t);
    else setDraft(idea.text);
  };

  return (
    <li
      className={cn(
        "rounded-xl border bg-card p-3 shadow-[var(--shadow-card)] transition-colors",
        highlight && "ring-2 ring-signal",
      )}
      style={{ borderLeftWidth: 3, borderLeftColor: colorSwatch(idea.color) }}
    >
      {editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          autoFocus
          rows={3}
          aria-label="Edit idea"
          className="w-full resize-none rounded-md border border-input bg-background px-2 py-1.5 text-sm leading-snug outline-none focus:border-accent"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="w-full whitespace-pre-wrap break-words text-left text-sm leading-snug"
          aria-label="Idea text — tap to edit"
        >
          {idea.text}
        </button>
      )}
      <div className="mt-2 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          {new Date(idea.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </span>
        <div className="flex items-center gap-1">
          {idea.promotedTo ? (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-wide"
              style={{
                color: "hsl(var(--qn-status-approved))",
                background: "hsl(var(--qn-status-approved) / 0.12)",
              }}
            >
              <Check className="h-3 w-3" aria-hidden />
              On board
            </span>
          ) : (
            <button
              type="button"
              onClick={onPromote}
              className="tactile inline-flex h-9 items-center gap-1 rounded-lg border border-border px-2.5 text-xs font-medium text-muted-foreground hover:text-primary"
            >
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              To board
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete idea"
            className="tactile inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </li>
  );
}
