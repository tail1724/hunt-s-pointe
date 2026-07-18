import { useCallback, useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { ArrowUp, BadgeCheck, Check, Link2, ListTree, Loader2, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCollection } from "@/lib/collections/useActiveCollection";
import { useDocumentAnnotations } from "@/lib/annotations/useDocumentAnnotations";
import { useDocumentVersions } from "@/lib/annotations/useDocumentVersions";
import { applyAnnotationToEditor } from "@/lib/annotations/applyAnnotation";
import { cadenceWouldFlatten } from "@/lib/authenticity/cadence";
import type { DocumentAnnotation } from "@/lib/annotations/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const SUGGESTIONS = [
  "Strengthen this paragraph",
  "Suggest a transition sentence",
  "Tighten this section",
  "Continue writing from here",
  "Rewrite for a general audience",
];

const FN_URL = (name: string) => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`;

async function authedFetch(name: string, body: unknown) {
  const { data: sess } = await supabase.auth.getSession();
  const tok = sess.session?.access_token;
  if (!tok) throw new Error("Not signed in");
  const resp = await fetch(FN_URL(name), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`Error ${resp.status}`);
  return resp.json();
}

/**
 * PressRoom never edits the manuscript directly (addendum feature 15).
 * The margin rail is the single surface where PressRoom proposes changes —
 * as annotations anchored to a selection or the cursor — and the editor
 * decides, one at a time, whether to apply, dismiss, or ignore each one.
 * AIBubbleMenu and SlashMenu also route through `annotations.propose`
 * (threaded down from Write.tsx) rather than editing in place.
 *
 * The editorial-intelligence toolbar (fact-check, interlink, structure —
 * addendum Group I) runs whole-document passes and files results as the
 * same kind of margin annotation, except read-only "flag" annotations have
 * no Apply action — there's nothing to integrate, only to resolve.
 */
export function MarginRail({
  documentId,
  editor,
  annotations,
  versions,
  voiceLocks,
  styleRules,
}: {
  documentId: string;
  editor: Editor | null;
  annotations: ReturnType<typeof useDocumentAnnotations>;
  versions: ReturnType<typeof useDocumentVersions>;
  voiceLocks?: string[];
  styleRules?: string[];
}) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkBusy, setCheckBusy] = useState<"fact" | "link" | "structure" | null>(null);
  const [structureReport, setStructureReport] = useState<string | null>(null);
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
      const j = await authedFetch("write-assist", {
        prompt: text,
        selected_text: selected || undefined,
        surrounding_text: surrounding.slice(0, 3000) || undefined,
        collection_id: collection?.id || undefined,
        voice_locks: voiceLocks,
        style_rules: styleRules,
      });
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
  }, [input, busy, editor, collection, annotations, voiceLocks, styleRules]);

  const runFactCheck = useCallback(async () => {
    if (!editor || checkBusy) return;
    setCheckBusy("fact");
    try {
      const documentText = editor.getText();
      const j = await authedFetch("fact-check", {
        document_id: documentId,
        document_text: documentText.slice(0, 8000),
        collection_id: collection?.id || undefined,
      });
      const claims: Array<{ claim: string; verdict: string; confidence: number; reason: string }> = j.claims ?? [];
      const flagged = claims.filter((c) => c.verdict !== "supported");
      for (const c of flagged) {
        await annotations.propose({
          body: `Fact-check — ${c.verdict} (${Math.round((c.confidence ?? 0) * 100)}%)`,
          proposedText: c.reason || "Could not be verified against your archive or general knowledge.",
          spanFrom: 0,
          spanTo: 0,
          anchorText: c.claim,
          source: "fact_check",
          kind: "flag",
          severity: c.verdict === "contradicted" ? "warning" : "suggestion",
        });
      }
      toast.success(`Checked ${claims.length} claim${claims.length === 1 ? "" : "s"} — ${flagged.length} flagged`);
    } catch (e: any) {
      toast.error(e.message || "Fact-check failed");
    } finally {
      setCheckBusy(null);
    }
  }, [editor, checkBusy, documentId, collection, annotations]);

  const runInterlink = useCallback(async () => {
    if (!editor || checkBusy) return;
    setCheckBusy("link");
    try {
      const documentText = editor.getText();
      const j = await authedFetch("interlink", {
        document_text: documentText.slice(0, 8000),
        collection_id: collection?.id || undefined,
      });
      const results: Array<{ type: string; note: string; excerpt: string }> = j.results ?? [];
      for (const r of results) {
        await annotations.propose({
          body: r.type === "contradiction" ? "Interlink — possible contradiction" : "Interlink — related coverage",
          proposedText: r.note,
          spanFrom: 0,
          spanTo: 0,
          anchorText: r.excerpt || null,
          source: "interlink",
          kind: "flag",
          severity: r.type === "contradiction" ? "warning" : "suggestion",
        });
      }
      toast.success(results.length > 0 ? `Found ${results.length} archive connection${results.length === 1 ? "" : "s"}` : "No archive connections found");
    } catch (e: any) {
      toast.error(e.message || "Interlink search failed");
    } finally {
      setCheckBusy(null);
    }
  }, [editor, checkBusy, collection, annotations]);

  const runStructure = useCallback(async () => {
    if (!editor || checkBusy) return;
    setCheckBusy("structure");
    setStructureReport(null);
    try {
      const documentText = editor.getText();
      const j = await authedFetch("document-ai", { action: "structure", document_text: documentText });
      setStructureReport(j.text || "No structural issues surfaced.");
    } catch (e: any) {
      toast.error(e.message || "Structure analysis failed");
    } finally {
      setCheckBusy(null);
    }
  }, [editor, checkBusy]);

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
        <span className="ml-auto text-[10px] text-muted-foreground/60">Margin only</span>
      </div>

      <div className="flex items-center gap-1 border-b border-border/40 px-2 py-1.5">
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px]" onClick={runFactCheck} disabled={!!checkBusy} title="Verify facts against your archive">
          {checkBusy === "fact" ? <Loader2 className="h-3 w-3 animate-spin" /> : <BadgeCheck className="h-3 w-3" />} Verify
        </Button>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px]" onClick={runInterlink} disabled={!!checkBusy} title="Find related or contradicting coverage">
          {checkBusy === "link" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />} Interlink
        </Button>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px]" onClick={runStructure} disabled={!!checkBusy} title="Analyze narrative structure (read-only)">
          {checkBusy === "structure" ? <Loader2 className="h-3 w-3 animate-spin" /> : <ListTree className="h-3 w-3" />} Structure
        </Button>
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
        {structureReport && (
          <div className="pressroom-artifact-reveal rounded-lg border border-border/60 bg-card/80 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Structure report — read only</p>
              <button type="button" onClick={() => setStructureReport(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="prose prose-sm max-w-none text-xs text-foreground">
              <ReactMarkdown>{structureReport}</ReactMarkdown>
            </div>
          </div>
        )}

        {annotations.open.length === 0 && !structureReport ? (
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
          annotations.open.map((a) => {
            const isFlag = a.kind === "flag";
            const flattens = !isFlag && !!(a.anchor_text && a.proposed_text && cadenceWouldFlatten(a.anchor_text, a.proposed_text));
            const warn = a.severity === "warning";
            return (
              <div
                key={a.id}
                className={cn(
                  "pressroom-artifact-reveal rounded-lg border p-3",
                  warn ? "border-guardrail/30 bg-guardrail/10" : "border-ai/25 bg-ai-wash/10",
                )}
              >
                <p className={cn("mb-1.5 text-[10px] uppercase tracking-wider", warn ? "text-guardrail" : "text-ai/80")}>{a.body}</p>
                {a.anchor_text && (
                  <p className={cn(
                    "mb-1.5 rounded bg-muted/40 px-2 py-1 text-xs text-muted-foreground",
                    !isFlag && "line-through decoration-muted-foreground/40",
                  )}>
                    {a.anchor_text.slice(0, 160)}
                  </p>
                )}
                <p className="mb-2.5 whitespace-pre-wrap text-xs leading-relaxed text-foreground">{a.proposed_text}</p>
                {flattens && (
                  <p className="mb-2.5 flex items-start gap-1.5 rounded bg-guardrail/10 px-2 py-1.5 text-[11px] text-guardrail">
                    <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" />
                    This edit flattens your natural cadence — sentence rhythm reads more uniform than your original.
                  </p>
                )}
                <div className="flex items-center gap-2">
                  {!isFlag && (
                    <Button size="sm" variant="default" className="h-7 gap-1 text-xs" onClick={() => applyAnnotation(a)}>
                      <Check className="h-3 w-3" /> Apply
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => dismiss(a)}>
                    <X className="h-3 w-3" /> {isFlag ? "Got it" : "Dismiss"}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

