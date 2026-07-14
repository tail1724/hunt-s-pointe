import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCollection } from "@/lib/collections/useActiveCollection";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

const SUGGESTIONS = [
  "Strengthen this paragraph",
  "Add a scripture reference",
  "Make this more concise",
  "Suggest a transition sentence",
  "Rewrite for a youth audience",
];

const WRITE_ASSIST_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/write-assist`;

interface Props {
  getSelectedText: () => string;
  getSurroundingText: () => string;
  onInsert: (text: string) => void;
  onReplace: (text: string) => void;
  hidden?: boolean;
  /**
   * "panel"    — full-height side panel beside the editor (desktop).
   * "floating" — compact bar pinned under the page (small screens).
   */
  variant?: "floating" | "panel";
}

export function EzraAssistBar({
  getSelectedText,
  getSurroundingText,
  onInsert,
  onReplace,
  hidden,
  variant = "floating",
}: Props) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [ghostIdx, setGhostIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { collection } = useActiveCollection("write");

  useEffect(() => {
    if (input || busy) return;
    const t = setInterval(() => setGhostIdx((i) => (i + 1) % SUGGESTIONS.length), 4000);
    return () => clearInterval(t);
  }, [input, busy]);

  const submit = useCallback(async (prompt?: string) => {
    const text = prompt || input.trim();
    if (!text || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const tok = sess.session?.access_token;
      if (!tok) throw new Error("Not signed in");
      const selected = getSelectedText();
      const surrounding = getSurroundingText();
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
      setResult(j.result || j.text || "No result");
    } catch (e: any) {
      setResult(`Error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }, [input, busy, getSelectedText, getSurroundingText, collection]);

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
      setResult(null);
      setInput("");
    }
  };

  if (hidden) return null;

  const inputRow = (
    <div className="flex items-center gap-2 px-3 py-2">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(40_56%_51%/0.15)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[hsl(40_56%_51%)]" />
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
          aria-label="Ask Ezra to help with your writing"
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

  const resultActions = result && (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="default" onClick={() => { onInsert(result); setResult(null); setInput(""); }}>
        Insert below
      </Button>
      <Button size="sm" variant="outline" onClick={() => { onReplace(result); setResult(null); setInput(""); }}>
        Replace selection
      </Button>
      <Button size="sm" variant="ghost" onClick={() => { setResult(null); setInput(""); }} aria-label="Dismiss">
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );

  const busySkeleton = (
    <div className="space-y-2.5" aria-label="Ezra is writing">
      <div className="shimmer h-3 w-11/12 rounded" />
      <div className="shimmer h-3 w-full rounded" />
      <div className="shimmer h-3 w-4/5 rounded" />
    </div>
  );

  if (variant === "panel") {
    return (
      <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card/70 backdrop-blur-sm print:hidden">
        <div className="flex items-center gap-2 border-b border-border/40 px-3.5 py-2.5">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[hsl(40_56%_51%/0.15)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(40_56%_51%)]" />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ezra</span>
          <span className="ml-auto text-[10px] text-muted-foreground/60">Writing partner</span>
        </div>

        <div className="border-b border-border/40">{inputRow}</div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {busy ? (
            busySkeleton
          ) : result ? (
            <div className="ezra-artifact-reveal space-y-3">
              <div className="prose prose-sm max-w-none text-sm text-foreground">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
              {resultActions}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs leading-5 text-muted-foreground">
                Select a passage in your document, or just ask — Ezra answers here with your
                manuscript in view.
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
        {result && (
          <div className="ezra-artifact-reveal space-y-3 border-t border-border/40 px-4 py-3">
            <div className="prose prose-sm max-h-48 max-w-none overflow-y-auto text-sm text-foreground">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
            {resultActions}
          </div>
        )}
      </div>
    </div>
  );
}
