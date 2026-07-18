import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Check, Loader2, TriangleAlert, X } from "lucide-react";
import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCollection } from "@/lib/collections/useActiveCollection";
import { useDocumentAnnotations } from "@/lib/annotations/useDocumentAnnotations";
import { useDocumentVersions } from "@/lib/annotations/useDocumentVersions";
import { applyAnnotationToEditor } from "@/lib/annotations/applyAnnotation";
import { cadenceWouldFlatten } from "@/lib/authenticity/cadence";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

const SUGGESTIONS = [
  "Strengthen this paragraph",
  "Tighten this section",
  "Suggest a transition sentence",
  "Continue writing from here",
  "Rewrite for a general audience",
];

const WRITE_ASSIST_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/write-assist`;

interface Props {
  editor: Editor | null;
  annotations: ReturnType<typeof useDocumentAnnotations>;
  versions: ReturnType<typeof useDocumentVersions>;
  hidden?: boolean;
  voiceLocks?: string[];
  styleRules?: string[];
  /**
   * "panel"    — full-height side panel beside the editor (desktop).
   * "floating" — compact bar pinned under the page (small screens).
   */
  variant?: "floating" | "panel";
}

/**
 * The compact/mobile counterpart to MarginRail — same non-destructive
 * contract (addendum feature 15): every ask proposes a margin annotation,
 * never edits the manuscript directly. Applying it goes through the same
 * `applyAnnotationToEditor` helper MarginRail uses, so History stays
 * consistent regardless of which surface the editor used.
 */
export function PressRoomAssistBar({
  editor,
  annotations,
  versions,
  hidden,
  voiceLocks,
  styleRules,
  variant = "floating",
}: Props) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [ghostIdx, setGhostIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { collection } = useActiveCollection("write");

  // The most recent open suggestion from ANY surface, so the compact bar
  // stays in sync with the margin rail rather than tracking its own copy.
  const latest = annotations.open[0] ?? null;

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
          voice_locks: voiceLocks,
          style_rules: styleRules,
        }),
      });
      if (!resp.ok) throw new Error(`Error ${resp.status}`);
      const j = await resp.json();
      const proposedText: string = j.result || j.text || "";
      if (!proposedText.trim()) { toast.error("PressRoom didn't return a suggestion"); return; }
      await annotations.propose({
        body: text,
        proposedText,
        spanFrom: from,
        spanTo: to,
        anchorText: selected || null,
        source: "assist",
      });
    } catch (e: any) {
      toast.error(e.message || "Couldn't reach PressRoom");
    } finally {
      setBusy(false);
    }
  }, [input, busy, editor, collection, annotations, voiceLocks, styleRules]);

  const apply = useCallback(async () => {
    if (!editor || !latest) return;
    const ok = await applyAnnotationToEditor(editor, latest, annotations.resolve, versions.record);
    toast[ok ? "success" : "error"](ok ? "Applied — recorded in History" : "The document changed — dismiss and re-ask.");
  }, [editor, latest, annotations, versions]);

  const dismiss = useCallback(() => {
    if (latest) annotations.resolve(latest.id, "dismissed");
  }, [latest, annotations]);

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
    if (e.key === "Escape") {
      setInput("");
    }
  };

  if (hidden) return null;

  const inputRow = (
    <div className="flex items-center gap-2 px-3 py-2">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ai/15">
        <span className="h-1.5 w-1.5 rounded-full bg-ai" />
      </span>
      <div className="relative flex-1">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder=""
          disabled={busy}
          className="w-full border-0 bg-transparent text-base md:text-sm text-foreground outline-none placeholder:text-transparent"
          aria-label="Ask PressRoom to propose a change"
        />
        {!input && !busy && (
          <span className="pointer-events-none absolute inset-0 flex items-center text-base md:text-sm text-muted-foreground/50 transition-opacity duration-300">
            <span className="truncate">{SUGGESTIONS[ghostIdx]}</span>
            <kbd className="ml-2 rounded border border-border/40 bg-muted/40 px-1 py-0.5 font-mono text-[10px] text-muted-foreground/40">Tab</kbd>
          </span>
        )}
      </div>
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          disabled={!input.trim()}
          onClick={() => submit()}
          className="h-7 w-7 rounded-full"
          aria-label="Send"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );

  const latestFlattens = !!(latest?.anchor_text && latest?.proposed_text && cadenceWouldFlatten(latest.anchor_text, latest.proposed_text));

  const suggestionCard = latest && (
    <div className="pressroom-artifact-reveal space-y-3 border-t border-ai/25 bg-ai-wash/10 px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-ai/80">{latest.body}</p>
      <div className="prose prose-sm max-h-48 max-w-none overflow-y-auto text-sm text-foreground">
        <ReactMarkdown>{latest.proposed_text ?? ""}</ReactMarkdown>
      </div>
      {latestFlattens && (
        <p className="flex items-start gap-1.5 rounded bg-guardrail/10 px-2 py-1.5 text-[11px] text-guardrail">
          <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />
          This flattens your natural cadence.
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="default" className="gap-1" onClick={apply}>
          <Check className="h-3.5 w-3.5" /> Apply
        </Button>
        <Button size="sm" variant="outline" className="gap-1" onClick={dismiss}>
          <X className="h-3.5 w-3.5" /> Dismiss
        </Button>
      </div>
    </div>
  );

  const busySkeleton = (
    <div className="space-y-2.5" aria-label="PressRoom is drafting a suggestion">
      <div className="shimmer h-3 w-11/12 rounded" />
      <div className="shimmer h-3 w-full rounded" />
      <div className="shimmer h-3 w-4/5 rounded" />
    </div>
  );

  if (variant === "panel") {
    return (
      <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card/70 backdrop-blur-sm print:hidden">
        <div className="flex items-center gap-2 border-b border-border/40 px-3.5 py-2.5">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-ai/15">
            <span className="h-1.5 w-1.5 rounded-full bg-ai" />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">PressRoom</span>
          <span className="ml-auto text-[10px] text-muted-foreground/60">Writing partner</span>
        </div>

        <div className="border-b border-border/40">{inputRow}</div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {busy ? (
            busySkeleton
          ) : latest ? (
            <div className="pressroom-artifact-reveal space-y-3">
              <div className="prose prose-sm max-w-none text-sm text-foreground">
                <ReactMarkdown>{latest.proposed_text ?? ""}</ReactMarkdown>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={apply}>Apply</Button>
                <Button size="sm" variant="outline" onClick={dismiss}>Dismiss</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs leading-5 text-muted-foreground">
                Select a passage in your document, or just ask — every suggestion appears
                here as a proposal, never a direct edit.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.slice(0, 3).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { setInput(s); submit(s); }}
                    className="tactile rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    // bottom offset rides the live keyboard inset (0 when closed) so the bar
    // never ends up hidden behind an open on-screen keyboard on iOS; the
    // padding-bottom calc folds in the home-indicator safe area too.
    <div className="sticky bottom-[var(--kb-inset,0px)] z-30 mx-auto w-full max-w-[700px] px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] print:hidden">
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-lg backdrop-blur-md">
        {inputRow}
        {busy && <div className="border-t border-border/40 px-4 py-3">{busySkeleton}</div>}
        {!busy && suggestionCard}
      </div>
    </div>
  );
}
