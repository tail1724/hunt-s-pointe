import { useState } from "react";
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
  ResponsiveDialogFooter as DialogFooter,
} from "@/components/ui/responsive-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface SaveTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
}

export function SaveTemplateDialog({ open, onOpenChange, content }: SaveTemplateDialogProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState(content.slice(0, 50).replace(/[#*\n]/g, "").trim());
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user || !title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("knowledge_entries").insert({
      user_id: user.id,
      title: title.trim(),
      content_type: "template",
      content_text: content,
    });
    setSaving(false);
    if (error) {
      toast.error("Failed to save template");
    } else {
      toast.success("Template saved to Knowledge Base");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
        </DialogHeader>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Template title…"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
