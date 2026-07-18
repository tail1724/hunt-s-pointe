import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink, Copy, Download, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { markdownToTiptapJSON, markdownToPlainText } from "@/lib/markdown-to-tiptap";

interface Props {
  /** Print-ready markdown (draft body only, no preface or follow-up). */
  initialMarkdown: string;
  /** Default title (parsed from the draft H1 or supplied by PressRoom). */
  initialTitle: string;
  /** PressRoom session this draft came from. */
  sessionId?: string | null;
  messageIndex: number;
  /** Stable key — one document row per PressRoom message. */
  messageKey: string;
}

/**
 * Compact "file chip" representation of a draft inside a PressRoom chat bubble.
 * The actual draft body is never rendered inline — it lives in the document row
 * and opens in the Write surface, parsed as proper TipTap JSON (no raw markdown).
 */
export function InlineDocumentCard({ initialMarkdown, initialTitle, sessionId, messageKey }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [docId, setDocId] = useState<string | null>(null);
  const [title, setTitle] = useState(initialTitle);
  const [busy, setBusy] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);
  const createdRef = useRef(false);

  const wordCount = (markdownToPlainText(initialMarkdown).match(/\S+/g) || []).length;

  useEffect(() => {
    if (!user || createdRef.current) return;
    createdRef.current = true;
    (async () => {
      const { data: existing } = await supabase
        .from("documents" as any)
        .select("id, title")
        .eq("user_id", user.id)
        .eq("source_message_id", messageKey)
        .maybeSingle();
      if (existing) {
        setDocId((existing as any).id);
        setTitle((existing as any).title || initialTitle);
        setSavedOnce(true);
        return;
      }
      const tiptapJson = markdownToTiptapJSON(initialMarkdown);
      const plain = markdownToPlainText(initialMarkdown);
      const { data, error } = await supabase
        .from("documents" as any)
        .insert({
          user_id: user.id,
          title: initialTitle,
          content: tiptapJson as any,
          content_text: plain,
          source: "mary",
          source_session_id: sessionId ?? null,
          source_message_id: messageKey,
          auto_created: true,
        } as any)
        .select("id")
        .single();
      if (error) {
        console.error("Auto-draft failed", error);
        return;
      }
      setDocId((data as any).id);
      setSavedOnce(true);
    })();
  }, [user, messageKey, sessionId, initialTitle, initialMarkdown]);

  const open = () => {
    if (!docId) return;
    navigate(`/app/write/${docId}`);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(markdownToPlainText(initialMarkdown));
    toast.success("Copied");
  };

  const download = () => {
    const blob = new Blob([initialMarkdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safe = (title || "document").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    a.href = url; a.download = `${safe}.md`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={open}
      disabled={!docId}
      className="group w-full text-left flex flex-wrap items-center gap-3 rounded-xl border border-[hsl(40_56%_51%/0.25)] bg-[hsl(38_47%_94%/0.55)] hover:bg-[hsl(38_47%_94%)] hover:border-[hsl(40_56%_51%/0.5)] hover:shadow-[0_4px_14px_hsl(222_43%_8%/0.18)] transition-all px-3.5 py-3 text-[hsl(30_3%_14%)] disabled:opacity-60"
      aria-label={`Open ${title} in Write`}
    >
      <div className="h-9 w-9 shrink-0 rounded-lg bg-[hsl(222_43%_20%)] text-[hsl(38_47%_94%)] grid place-items-center group-hover:scale-[1.04] transition-transform">
        <FileText className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{title || "Untitled draft"}</div>
        <div className="text-[11px] text-[hsl(222_43%_20%/0.65)] flex items-center gap-1.5 mt-0.5">
          <span>Draft · {wordCount.toLocaleString()} words</span>
          <span>·</span>
          {savedOnce ? (
            <span className="inline-flex items-center gap-1"><Check className="h-3 w-3" /> Auto-saved</span>
          ) : (
            <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Drafting</span>
          )}
        </div>
      </div>
      {/* Always visible — wraps to its own row on narrow phones instead of
          hiding Copy/Download entirely below sm. */}
      <div className="flex w-full sm:w-auto justify-end sm:justify-start items-center gap-1 shrink-0 mt-1 sm:mt-0 sm:ml-auto">
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="h-7 text-xs gap-1 text-[hsl(222_43%_20%)] hover:bg-[hsl(222_43%_20%/0.08)]"
          onClick={(e) => { e.stopPropagation(); copy(); }}
        >
          <span><Copy className="h-3 w-3" /> Copy</span>
        </Button>
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="h-7 text-xs gap-1 text-[hsl(222_43%_20%)] hover:bg-[hsl(222_43%_20%/0.08)]"
          onClick={(e) => { e.stopPropagation(); download(); }}
        >
          <span><Download className="h-3 w-3" /> .md</span>
        </Button>
        <Button
          asChild
          size="sm"
          className="h-7 text-xs gap-1 bg-[hsl(222_43%_20%)] text-[hsl(38_47%_94%)] hover:bg-[hsl(222_43%_25%)]"
          disabled={!docId}
          onClick={(e) => { e.stopPropagation(); open(); }}
        >
          <span><ExternalLink className="h-3 w-3" /> Open</span>
        </Button>
      </div>
      {busy && <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />}
    </button>
  );
}
