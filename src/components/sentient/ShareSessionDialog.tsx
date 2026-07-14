import { useState } from "react";
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
  ResponsiveDialogDescription as DialogDescription,
  ResponsiveDialogFooter as DialogFooter,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Copy, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { sessionToMarkdown, downloadMarkdown } from "@/lib/export-session";
import type { Msg } from "./ChatMessages";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string | null;
  title: string;
  messages: Msg[];
}

function makeSlug() {
  const a = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length: 10 }, () => a[Math.floor(Math.random() * a.length)]).join("");
}

export function ShareSessionDialog({ open, onOpenChange, sessionId, title, messages }: Props) {
  const { user } = useAuth();
  const [redact, setRedact] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!user || !sessionId) { toast.error("Save a session first"); return; }
    setBusy(true);
    const slug = makeSlug();
    const { error } = await supabase.from("shared_sessions" as any).insert({
      user_id: user.id, session_id: sessionId, slug, redact_user_msgs: redact,
    } as any);
    setBusy(false);
    if (error) { toast.error("Share failed"); return; }
    const url = `${window.location.origin}/s/${slug}`;
    setLink(url);
    navigator.clipboard.writeText(url).catch(() => {});
    toast.success("Link copied");
  };

  const exportMd = () => {
    downloadMarkdown(title || "ezra-session", sessionToMarkdown(title || "Ezra Session", messages));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share session</DialogTitle>
          <DialogDescription>Create a read-only public link or export the transcript.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-md border border-border p-3">
          <div>
            <Label htmlFor="redact" className="text-sm">Redact my messages</Label>
            <p className="text-[10px] text-muted-foreground">Hide your prompts; show assistant replies only.</p>
          </div>
          <Switch id="redact" checked={redact} onCheckedChange={setRedact} />
        </div>

        {link && (
          <div className="flex gap-1">
            <Input readOnly value={link} className="text-xs" />
            <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(link); toast.success("Copied"); }} aria-label="Copy link">
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={exportMd} className="gap-1.5"><Download className="h-3.5 w-3.5" /> Export Markdown</Button>
          <Button onClick={create} disabled={busy}>{link ? "Re-share" : "Create link"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
