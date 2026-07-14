import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

interface CampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editCampaign?: { id: string; name: string; description: string | null; avatar_url: string | null } | null;
  onSaved: () => void;
}

export function CampaignDialog({ open, onOpenChange, editCampaign, onSaved }: CampaignDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editCampaign) {
      setName(editCampaign.name);
      setDescription(editCampaign.description || "");
      setAvatarUrl(editCampaign.avatar_url);
    } else {
      setName("");
      setDescription("");
      setAvatarUrl(null);
    }
  }, [editCampaign, open]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/campaign-avatars/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("generated-media").upload(path, file);
    if (error) {
      toast.error("Upload failed: " + error.message);
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("generated-media").getPublicUrl(path);
    setAvatarUrl(urlData.publicUrl);
    setUploading(false);
  };

  const handleSave = async () => {
    if (!user || !name.trim()) return;
    setSaving(true);
    if (editCampaign) {
      const { error } = await supabase
        .from("campaigns")
        .update({ name, description: description || null, avatar_url: avatarUrl })
        .eq("id", editCampaign.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Campaign updated!");
    } else {
      const { error } = await supabase
        .from("campaigns")
        .insert({ user_id: user.id, name, description: description || null, avatar_url: avatarUrl });
      if (error) { toast.error(error.message); setSaving(false); return; }
      toast.success("Campaign created!");
    }
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{editCampaign ? "Edit Campaign" : "New Campaign"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="text-lg">{name ? name[0] : "?"}</AvatarFallback>
            </Avatar>
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" asChild disabled={uploading}>
                <span>
                  {uploading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-2 h-3.5 w-3.5" />}
                  Upload Avatar
                </span>
              </Button>
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </label>
          </div>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Brand" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A brief description of this campaign account…" rows={3} />
          </div>
          <Button onClick={handleSave} disabled={saving || !name.trim()} className="w-full">
            {saving ? "Saving…" : editCampaign ? "Save Changes" : "Create Campaign"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
