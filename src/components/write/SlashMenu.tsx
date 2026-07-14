import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Heading1, Heading2, List, ListOrdered, Quote, BookOpen, Sparkles, Loader2, Zap, Eye, Hash, MessageSquareQuote, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Item = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  run: (editor: Editor) => unknown;
};

interface Pos { top: number; left: number; }

/** Insert an Axios-style callout block: bold label + placeholder body. */
function insertCallout(e: Editor, label: string, placeholder: string) {
  e.chain()
    .focus()
    .insertContent([
      { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: label }] },
      { type: "paragraph", content: [{ type: "text", text: placeholder }] },
    ])
    .run();
}

export function SlashMenu({ editor }: { editor: Editor }) {
  const [pos, setPos] = useState<Pos | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const slashFromRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const items: Item[] = [
    { id: "h1", label: "Heading 1", icon: Heading1, run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
    { id: "h2", label: "Heading 2", icon: Heading2, run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
    { id: "ul", label: "Bullet list", icon: List, run: (e) => e.chain().focus().toggleBulletList().run() },
    { id: "ol", label: "Numbered list", icon: ListOrdered, run: (e) => e.chain().focus().toggleOrderedList().run() },
    { id: "quote", label: "Quote", icon: Quote, run: (e) => e.chain().focus().toggleBlockquote().run() },
    // Smart-brevity newsroom blocks
    { id: "why", label: "Why it matters", icon: Zap, run: (e) => insertCallout(e, "Why it matters:", "One sentence on the stakes.") },
    { id: "big", label: "The big picture", icon: Eye, run: (e) => insertCallout(e, "The big picture:", "Zoom out. What's the trend?") },
    { id: "numbers", label: "By the numbers", icon: Hash, run: (e) => insertCallout(e, "By the numbers:", "Lead with the number that matters.") },
    { id: "saying", label: "What they're saying", icon: MessageSquareQuote, run: (e) => insertCallout(e, "What they're saying:", "\"Quote here.\" — Source, title") },
    { id: "deeper", label: "Go deeper", icon: Link2, run: (e) => insertCallout(e, "Go deeper:", "Link to the primary source.") },
    { id: "scripture", label: "Add reference", icon: BookOpen, run: (e) => e.chain().focus().insertContent("\n> _Reference here_\n").run() },
    { id: "continue", label: "✨ Continue writing with AI", icon: Sparkles, run: async (e) => await runContinue(e) },
  ];

  const filtered = query
    ? items.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()))
    : items;

  const closeMenu = () => {
    setPos(null); setQuery(""); setActiveIndex(0); slashFromRef.current = null;
  };

  const runContinue = async (e: Editor) => {
    const { from } = e.state.selection;
    const before = e.state.doc.textBetween(Math.max(0, from - 1000), from, "\n");
    setBusy(true);
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
        body: JSON.stringify({ action: "continue", context: before }),
      });
      if (!resp.ok) {
        if (resp.status === 429) toast.error("Rate limited.");
        else if (resp.status === 402) toast.error("AI credits exhausted.");
        else toast.error(`Continue failed (${resp.status})`);
        return;
      }
      const { text } = await resp.json();
      if (typeof text === "string" && text.trim().length) {
        e.chain().focus().insertContent(text.trim()).run();
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not reach the AI service");
    } finally {
      setBusy(false);
    }
  };

  // Detect "/" at start of an empty line / after whitespace.
  useEffect(() => {
    const onUpdate = () => {
      const { from } = editor.state.selection;
      const $from = editor.state.doc.resolve(from);
      const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, "\n");

      if (slashFromRef.current !== null) {
        // Already tracking — update query or close if backspaced past slash
        if (from < slashFromRef.current) { closeMenu(); return; }
        const q = editor.state.doc.textBetween(slashFromRef.current, from, " ");
        if (q.includes(" ") || q.includes("\n")) { closeMenu(); return; }
        setQuery(q);
        return;
      }
      // Detect new slash
      const lastChar = textBefore.slice(-1);
      const prevChar = textBefore.slice(-2, -1);
      if (lastChar === "/" && (prevChar === "" || prevChar === " ")) {
        const coords = editor.view.coordsAtPos(from);
        setPos({ top: coords.bottom + window.scrollY + 6, left: coords.left + window.scrollX });
        slashFromRef.current = from;
        setQuery("");
        setActiveIndex(0);
      }
    };
    editor.on("selectionUpdate", onUpdate);
    editor.on("update", onUpdate);
    return () => {
      editor.off("selectionUpdate", onUpdate);
      editor.off("update", onUpdate);
    };
  }, [editor]);

  // Keyboard nav
  useEffect(() => {
    if (!pos) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); closeMenu(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(filtered.length - 1, i + 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(0, i - 1)); return; }
      if (e.key === "Enter") {
        e.preventDefault();
        const item = filtered[activeIndex];
        if (!item) return;
        const { from } = editor.state.selection;
        if (slashFromRef.current !== null) {
          // Remove the "/query"
          editor.chain().focus().deleteRange({ from: slashFromRef.current - 1, to: from }).run();
        }
        closeMenu();
        Promise.resolve(item.run(editor));
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [pos, filtered, activeIndex, editor]);

  if (!pos && !busy) return null;

  return (
    <div
      style={{ position: "absolute", top: pos?.top, left: pos?.left }}
      className="z-50 w-64 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl overflow-hidden"
      onMouseDown={(e) => e.preventDefault()}
    >
      {busy ? (
        <div className="px-3 py-3 text-xs text-muted-foreground inline-flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Ezra is writing…
        </div>
      ) : (
        <div className="py-1 max-h-72 overflow-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">No matches</div>
          ) : (
            filtered.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  const { from } = editor.state.selection;
                  if (slashFromRef.current !== null) {
                    editor.chain().focus().deleteRange({ from: slashFromRef.current - 1, to: from }).run();
                  }
                  closeMenu();
                  Promise.resolve(item.run(editor));
                }}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 ${idx === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"}`}
              >
                <item.icon className="h-3.5 w-3.5" /> {item.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
