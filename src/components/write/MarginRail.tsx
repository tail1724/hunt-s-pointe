import { useCallback, useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { ArrowUp, Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCollection } from "@/lib/collections/useActiveCollection";
import { useDocumentAnnotations } from "@/lib/annotations/useDocumentAnnotations";
import { useDocumentVersions } from "@/lib/annotations/useDocumentVersions";
import { applyAnnotationToEditor } from "@/lib/annotations/applyAnnotation";
import type { DocumentAnnotation } from "@/lib/annotations/types";
import { toast } from "sonner";

const SUGGESTIONS = [
  "Strengthen this paragraph",
  "Suggest a transition sentence",
  "Tighten this section",
  "Continue writing from here",
  "Rewrite for a general audience",
];

const WRITE_ASSIST_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/write-assist`;

/**
 * PressRoom never edits the manuscript directly (addendum feature 15).
 * The margin rail is the single surface where PressRoom proposes changes —
 * as annotations anchored to a selection or the cursor — and the editor
 * decides, one at a time, whether to apply, dismiss, or ignore each one.
 * AIBubbleMenu and SlashMenu also route through `annotations.propose`
 * (threaded down from Write.tsx) rather than editing in place.
 */
export function MarginRail({
  editor,
  annotations,
  versions,
}: {
  editor: Editor | null;
  annotations: ReturnType<typeof useDocumentAnnotations>;
  versions: ReturnType<typeof useDocumentVersions>;
}) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [ghostIdx, setGhostIdx] = useState(0);
  const { collection } = useActiveCollection("write");

  useEffect(() => {
    if (input || busy) return;
    const t = setInterval(() => setGhostIdx((i) => (i + 1) % SUGGESTIONS.length), 4000);
    return () => clearInterval(t);
  }, [input, busy]);

  const submit = useCallback(async (prompt?: string) => {
    const text = prompt || input.trim();
    if (!text || busy || !editor) return;
    setBusy(true);
    setInput("");
    try {
      const { from, to, empty } = editor.state.selection;
      const selected = empty ? "" : editor.state.doc.textBetween(from, to, " ");
      const surrounding = editor.state.doc.textBetween(0, Math.min(editor.state.doc.content.size, 3000), "\n");

      const { data: sess } = await supabase.auth.getSession();
      const tok = sess.session?.access_token;
      if (!tok) throw new Error("Not signed in");
      const resp = await fetch(WRITE_ASSIST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
        body: JSON.stringify({
          prompt: text,
          selected_text: selected || undefined,
          surrounding_text: surrounding.slice(0, 3000) || undefined,
          collection_id: collection?.id || undefined,
        }),
      });
      if (!resp.ok) throw new Error(`Error ${resp.status}`);
      const j = await resp.json();
      const proposedText: string = j.result || j.text || "";
      if (!proposedText.trim()) { toast.error("PressRoom didn't return a suggestion"); return; }

      await annotations.propose({
        body: text,
        proposedText,
        spanFrom: empty ? from : from,
        spanTo: empty ? from : to,
        anchorText: selected || null,
        source: "assist",
      });
    } catch (e: any) {
      toast.error(e.message || "Couldn't reach PressRoom");
    } finally {
      setBusy(false);
    }
  }, [input, busy, editor, collection, annotations]);

  const applyAnnotation = useCallback(async (a: DocumentAnnotation) => {
    if (!editor) return;
    const ok = await applyAnnotationToEditor(editor, a, annotations.resolve, versions.record);
    if (ok) toast.success("Applied — recorded in History");
    else toast.error("The document changed since this suggestion — dismiss and re-ask.");
  }, [editor, annotations, versions]);

  const dismiss = useCallback((a: DocumentAnnotation) => {
    annotations.resolve(a.id, "dismissed");
  }, [annotations]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Tab" && !input && !busy) {
      e.preventDefault();
      setInput(SUGGESTIONS[ghostIdx]);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card/70 backdrop-blur-sm print:hidden">
      <div className="flex items-center gap-2 border-b border-border/40 px-3.5 py-2.5">
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-ai/15">
          <span className="h-1.5 w-1.5 rounded-full bg-ai" />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">PressRoom</span>
        <span className="ml-auto text-[10px] text-muted-foreground/60">Margin only — never overwrites</span>
      </div>

      <div className="border-b border-border/40 px-3 py-2">
        <div className="relative flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={busy}
            placeholder=""
            className="w-full border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-transparent"
            aria-label="Ask PressRoom to propose a change"
          />
          {!input && !busy && (
            <span className="pointer-events-none absolute inset-0 flex items-center text-sm text-muted-foreground/50">
              <span className="truncate">{SUGGESTIONS[ghostIdx]}</span>
              <kbd className="ml-2 rounded border border-border/40 bg-muted/40 px-1 py-0.5 font-mono text-[10px] text-muted-foreground/40">Tab</kbd>
            </span>
          )}
          {busy ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          ) : (
            <Button type="button" size="icon" variant="ghost" disabled={!input.trim()} onClick={() => submit()} className="h-7 w-7 shrink-0 rounded-full">
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
        {annotations.open.length === 0 ? (
          <div className="space-y-3">
            <p className="text-xs leading-5 text-muted-foreground">
              Select a passage and ask, or just type above — every suggestion appears here as a proposal.
              Nothing PressRoom writes lands in your manuscript until you apply it.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.slice(0, 3).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => submit(s)}
                  className="tactile rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-ai/40 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          annotations.open.map((a) => (
            <div key={a.id} className="ezra-artifact-reveal rounded-lg border border-ai/25 bg-ai-wash/10 p-3">
              <p className="mb-1.5 text-[10px] uppercase tracking-wider text-ai/80">{a.body}</p>
              {a.anchor_text && (
                <p className="mb-1.5 rounded bg-muted/40 px-2 py-1 text-xs text-muted-foreground line-through decoration-muted-foreground/40">
                  {a.anchor_text.slice(0, 160)}
                </p>
              )}
              <p className="mb-2.5 whitespace-pre-wrap text-xs leading-relaxed text-foreground">{a.proposed_text}</p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="default" className="h-7 gap-1 text-xs" onClick={() => applyAnnotation(a)}>
                  <Check className="h-3 w-3" /> Apply
                </Button>
                <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => dismiss(a)}>
                  <X className="h-3 w-3" /> Dismiss
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
