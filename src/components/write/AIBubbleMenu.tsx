import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Loader2, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Preset = { id: string; label: string };
const PRESETS: Preset[] = [
  { id: "comforting", label: "Make Comforting" },
  { id: "deepen", label: "Deepen Theology" },
  { id: "shorten", label: "Shorten" },
  { id: "scripture", label: "Add Scripture" },
  { id: "simplify", label: "Simplify" },
];

interface Pos { top: number; left: number; }

export function AIBubbleMenu({ editor }: { editor: Editor }) {
  const [pos, setPos] = useState<Pos | null>(null);
  const [busy, setBusy] = useState(false);
  const [askingFree, setAskingFree] = useState(false);
  const [freeText, setFreeText] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updatePos = () => {
      const { from, to, empty } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to, " ");
      if (empty || selectedText.trim().length < 5 || busy) {
        if (!busy) setPos(null);
        return;
      }
      const start = editor.view.coordsAtPos(from);
      const end = editor.view.coordsAtPos(to);
      const top = Math.min(start.top, end.top) + window.scrollY - 48;
      const left = (start.left + end.right) / 2 + window.scrollX;
      setPos({ top, left });
    };
    editor.on("selectionUpdate", updatePos);
    editor.on("blur", () => { /* keep menu while interacting */ });
    document.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      editor.off("selectionUpdate", updatePos);
      document.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [editor, busy]);

  const runRewrite = async (presetId: string, instruction?: string) => {
    const { from, to } = editor.state.selection;
    const selection = editor.state.doc.textBetween(from, to, " ");
    if (!selection.trim()) return;

    setBusy(true);
    // Visual loading hint: temporarily highlight the selection range.
    editor.chain().focus().setMark("bold").run();
    editor.chain().focus().unsetMark("bold").run();

    try {
      const { data: sessData } = await supabase.auth.getSession();
      const token = sessData.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/document-ai`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ action: "rewrite", preset: presetId, instruction, selection }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        if (resp.status === 429) toast.error("Rate limited. Try again in a moment.");
        else if (resp.status === 402) toast.error("AI credits exhausted. Add credits in workspace settings.");
        else toast.error(err.error || `Rewrite failed (${resp.status})`);
        return;
      }
      const { text } = await resp.json();
      if (typeof text === "string" && text.trim().length) {
        editor.chain().focus().insertContentAt({ from, to }, text.trim()).run();
      }
    } catch (e) {
      console.error(e);
      toast.error("Could not reach the AI service");
    } finally {
      setBusy(false);
      setAskingFree(false);
      setFreeText("");
    }
  };

  if (!pos && !busy) return null;

  return (
    <div
      ref={menuRef}
      style={{ position: "absolute", top: pos?.top, left: pos?.left, transform: "translateX(-50%)" }}
      className="z-50 rounded-full border border-border bg-popover text-popover-foreground shadow-lg backdrop-blur-md px-1.5 py-1 flex items-center gap-1 tactile"
      onMouseDown={(e) => e.preventDefault()}
    >
      {busy ? (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Rewriting…
        </span>
      ) : askingFree ? (
        <form
          onSubmit={(e) => { e.preventDefault(); if (freeText.trim()) runRewrite("free", freeText.trim()); }}
          className="flex items-center gap-1"
        >
          <input
            autoFocus
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") { setAskingFree(false); setFreeText(""); } }}
            placeholder="Ask Ezra to…"
            className="h-7 w-56 rounded-full bg-background border border-border px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button type="submit" className="h-7 px-2 text-[11px] rounded-full bg-primary text-primary-foreground">Go</button>
        </form>
      ) : (
        <>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => runRewrite(p.id)}
              className="h-7 px-2.5 text-[11px] rounded-full hover:bg-accent hover:text-accent-foreground transition-colors whitespace-nowrap"
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setAskingFree(true)}
            className="h-7 px-2 text-[11px] rounded-full bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center gap-1"
          >
            <Wand2 className="h-3 w-3" /> Ask Ezra
          </button>
        </>
      )}
    </div>
  );
}
