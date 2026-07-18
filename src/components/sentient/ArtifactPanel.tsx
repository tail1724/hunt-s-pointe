import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Download, ArrowRight, Save, X } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  content: string;
  onSave?: (next: string) => void;
}

export function ArtifactPanel({ open, onOpenChange, title, content, onSave }: Props) {
  const [draft, setDraft] = useState(content);
  const [editing, setEditing] = useState(false);
  const navigate = useNavigate();

  const copy = () => { navigator.clipboard.writeText(content); toast.success("Copied"); };
  const download = () => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.md`; a.click();
    URL.revokeObjectURL(url);
  };
  const sendToPressRoom = () => {
    sessionStorage.setItem("prefill-seed", content);
    navigate("/app/sentient");
    toast.success("Sent to PressRoom");
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) setEditing(false); onOpenChange(v); }}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col">
        <SheetHeader className="space-y-1">
          <SheetTitle className="text-base">{title}</SheetTitle>
          <SheetDescription className="text-xs">Artifact · {content.length.toLocaleString()} chars</SheetDescription>
        </SheetHeader>

        <div className="flex flex-wrap gap-1.5 mt-2">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={copy} aria-label="Copy artifact"><Copy className="h-3 w-3"/> Copy</Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={download} aria-label="Download artifact"><Download className="h-3 w-3"/> .md</Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={sendToPressRoom} aria-label="Send artifact to PressRoom"><ArrowRight className="h-3 w-3"/> PressRoom</Button>
          {onSave && !editing && (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setDraft(content); setEditing(true); }}>Edit</Button>
          )}
          {editing && (
            <>
              <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={() => { onSave?.(draft); setEditing(false); toast.success("Saved"); }}><Save className="h-3 w-3"/> Save</Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setEditing(false)}><X className="h-3 w-3"/> Cancel</Button>
            </>
          )}
        </div>

        <div className="flex-1 overflow-auto mt-3 rounded-md border border-border bg-muted/40">
          {editing ? (
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="h-full min-h-[400px] border-0 bg-transparent font-mono text-xs" />
          ) : (
            <pre className="text-xs p-4 whitespace-pre-wrap font-mono">{content}</pre>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Heuristic: long output or fenced block → treat as artifact. */
export function detectArtifact(content: string): { isArtifact: boolean; title: string } | null {
  const lines = content.split("\n");
  if (lines.length >= 40 || content.length > 1800) {
    // Try to extract a title from the first H1/H2 or first non-empty line.
    const titleLine = lines.find((l) => /^#{1,3}\s+/.test(l)) ?? lines.find((l) => l.trim().length > 0) ?? "Artifact";
    const title = titleLine.replace(/^#+\s*/, "").slice(0, 60).trim() || "Artifact";
    return { isArtifact: true, title };
  }
  return null;
}
