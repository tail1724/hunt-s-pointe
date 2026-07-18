import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, GripHorizontal, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ORGANIZE_COLORS, colorSwatch } from "@/lib/organize/types";
import {
  IDEA_CANVAS_HEIGHT, IDEA_CANVAS_WIDTH, IDEA_NOTE_WIDTH, type IdeaNote,
} from "@/lib/ideas/store";

interface Props {
  idea: IdeaNote;
  onMove: (id: string, x: number, y: number) => void;
  onEdit: (id: string, text: string) => void;
  onRecolor: (id: string, color: string) => void;
  onDelete: (id: string) => void;
  onPromote: (idea: IdeaNote) => void;
}

/**
 * A draggable sticky note on the desktop idea canvas. Dragging is plain
 * pointer capture (no dnd-kit) so the note also works with pen input; the
 * position commits to the local-first store on release.
 */
export function IdeaStickyNote({ idea, onMove, onEdit, onRecolor, onDelete, onPromote }: Props) {
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(idea.text);
  const dragOrigin = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (editing) {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(draft.length, draft.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const clamp = (x: number, y: number) => ({
    x: Math.min(Math.max(0, x), IDEA_CANVAS_WIDTH - IDEA_NOTE_WIDTH),
    y: Math.min(Math.max(0, y), IDEA_CANVAS_HEIGHT - 80),
  });

  const startDrag = (e: React.PointerEvent) => {
    if (editing) return;
    dragOrigin.current = { px: e.clientX, py: e.clientY, x: idea.x, y: idea.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const moveDrag = (e: React.PointerEvent) => {
    const o = dragOrigin.current;
    if (!o) return;
    setDrag(clamp(o.x + (e.clientX - o.px), o.y + (e.clientY - o.py)));
  };

  const endDrag = () => {
    if (dragOrigin.current && drag) onMove(idea.id, drag.x, drag.y);
    dragOrigin.current = null;
    setDrag(null);
  };

  const commitEdit = () => {
    setEditing(false);
    const t = draft.trim();
    if (t && t !== idea.text) onEdit(idea.id, t);
    else setDraft(idea.text);
  };

  const pos = drag ?? { x: idea.x, y: idea.y };

  return (
    <div
      className={cn(
        "group absolute flex flex-col rounded-xl border bg-card shadow-[var(--shadow-card)] transition-shadow",
        drag ? "z-30 shadow-[var(--shadow-card-hover)]" : "z-10 hover:shadow-[var(--shadow-card-hover)]",
      )}
      style={{
        left: pos.x,
        top: pos.y,
        width: IDEA_NOTE_WIDTH,
        borderColor: `color-mix(in srgb, ${colorSwatch(idea.color)} 45%, transparent)`,
        borderTopWidth: 3,
        borderTopColor: colorSwatch(idea.color),
      }}
    >
      {/* Drag handle — the only surface that starts a move, so text stays selectable */}
      <div
        role="button"
        aria-label="Move idea"
        className="flex cursor-grab items-center justify-between rounded-t-lg px-2 pt-1.5 text-muted-foreground/60 active:cursor-grabbing"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{ touchAction: "none" }}
      >
        <GripHorizontal className="h-3.5 w-3.5" aria-hidden />
        {idea.promotedTo && (
          <span
            className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide"
            style={{
              color: "hsl(var(--qn-status-approved))",
              background: "hsl(var(--qn-status-approved) / 0.12)",
            }}
            title="Already promoted to a board card"
          >
            <Check className="h-2.5 w-2.5" aria-hidden />
            On board
          </span>
        )}
      </div>

      {editing ? (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Escape") { setDraft(idea.text); setEditing(false); }
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commitEdit();
          }}
          rows={4}
          aria-label="Edit idea"
          className="mx-2 mb-2 resize-none rounded-md border border-input bg-background px-2 py-1.5 text-sm leading-snug outline-none focus:border-accent"
        />
      ) : (
        <button
          type="button"
          onDoubleClick={() => setEditing(true)}
          onClick={(e) => { if (e.detail === 1 && window.matchMedia("(hover: none)").matches) setEditing(true); }}
          className="whitespace-pre-wrap break-words px-3 pb-2 pt-1 text-left text-sm leading-snug"
          aria-label="Idea text — double-click to edit"
        >
          {idea.text}
        </button>
      )}

      {/* Footer actions appear on hover/focus so the canvas stays calm */}
      <div className="flex items-center justify-between gap-1 px-2 pb-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <div className="flex items-center gap-1" role="group" aria-label="Note color">
          {Object.entries(ORGANIZE_COLORS).map(([key, c]) => (
            <button
              key={key}
              type="button"
              aria-label={`Color ${c.label}`}
              aria-pressed={idea.color === key}
              onClick={() => onRecolor(idea.id, key)}
              className={cn(
                "h-3.5 w-3.5 rounded-full border border-foreground/10 transition-transform",
                idea.color === key ? "scale-125 ring-1 ring-ring ring-offset-1" : "hover:scale-110",
              )}
              style={{ background: c.swatch }}
            />
          ))}
        </div>
        <div className="flex items-center">
          {!idea.promotedTo && (
            <button
              type="button"
              onClick={() => onPromote(idea)}
              title="Promote to a board"
              aria-label="Promote to a board"
              className="tactile rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-primary"
            >
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(idea.id)}
            title="Delete idea"
            aria-label="Delete idea"
            className="tactile rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
