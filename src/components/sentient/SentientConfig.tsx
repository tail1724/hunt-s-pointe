import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface SentientConfigProps {
  onClose: () => void;
}

interface Preferences {
  name?: string;
  purpose?: string;
  avatar_preset?: string;
  color_theme?: string;
  visual_style?: string;
}

const AVATAR_PRESETS = ["nexus", "orb", "crystal", "helix", "prism"];
const COLOR_PRESETS = [
  { name: "Default", value: "" },
  { name: "Ocean", value: "ocean" },
  { name: "Sunset", value: "sunset" },
  { name: "Forest", value: "forest" },
  { name: "Lavender", value: "lavender" },
  { name: "Monochrome", value: "monochrome" },
];
const VISUAL_STYLES = [
  { name: "Biomorphic", value: "biomorphic", desc: "Organic cell nucleus" },
  { name: "Tesseract", value: "tesseract", desc: "3D wireframe geometry" },
];

export function SentientConfig({ onClose }: SentientConfigProps) {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Preferences>({
    name: "PressRoom",
    purpose: "",
    avatar_preset: "nexus",
    color_theme: "",
    visual_style: "biomorphic",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("system_settings" as any)
        .select("preferences")
        .eq("user_id", user.id)
        .single();
      if (data && (data as any).preferences) {
        setPrefs((p) => ({ ...p, ...(data as any).preferences }));
      }
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("system_settings" as any)
        .upsert(
          { user_id: user.id, preferences: prefs } as any,
          { onConflict: "user_id" } as any
        );
      if (error) throw error;
      toast.success("Configuration saved");
      onClose();
    } catch (e) {
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4 max-w-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-bold">PressRoom Configuration</h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs">AI Name</Label>
          <Input
            value={prefs.name || ""}
            onChange={(e) => setPrefs((p) => ({ ...p, name: e.target.value }))}
            placeholder="PressRoom"
            className="text-sm h-8 mt-1"
          />
        </div>

        <div>
          <Label className="text-xs">Purpose</Label>
          <Textarea
            value={prefs.purpose || ""}
            onChange={(e) => setPrefs((p) => ({ ...p, purpose: e.target.value }))}
            placeholder="Describe the AI's focus area…"
            className="text-sm min-h-[60px] mt-1"
            rows={2}
          />
        </div>

        {/* Visual Style */}
        <div>
          <Label className="text-xs">Visual Style</Label>
          <div className="flex gap-1.5 mt-1">
            {VISUAL_STYLES.map((vs) => (
              <button
                key={vs.value}
                onClick={() => setPrefs((p) => ({ ...p, visual_style: vs.value }))}
                title={vs.desc}
                className={`px-2.5 py-1.5 rounded-md text-[10px] border transition-all ${
                  prefs.visual_style === vs.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {vs.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs">Avatar Preset</Label>
          <div className="flex gap-1.5 mt-1">
            {AVATAR_PRESETS.map((a) => (
              <button
                key={a}
                onClick={() => setPrefs((p) => ({ ...p, avatar_preset: a }))}
                className={`px-2 py-1 rounded-md text-[10px] capitalize border transition-all ${
                  prefs.avatar_preset === a
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs">Color Theme</Label>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c.value}
                onClick={() => setPrefs((p) => ({ ...p, color_theme: c.value }))}
                className={`px-2 py-1 rounded-md text-[10px] border transition-all ${
                  prefs.color_theme === c.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Button onClick={save} disabled={saving} size="sm" className="w-full gap-2 text-xs">
        <Save className="h-3.5 w-3.5" />
        {saving ? "Saving…" : "Save Configuration"}
      </Button>
    </div>
  );
}
