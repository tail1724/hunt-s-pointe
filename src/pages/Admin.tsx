import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { useColorTheme, type ColorTheme } from "@/hooks/useColorTheme";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { VoiceStyleSettings } from "@/components/admin/VoiceStyleSettings";

const PALETTES: { key: ColorTheme; label: string; preview: string }[] = [
  { key: "reverent", label: "Vibrant (Default)", preview: "bg-gradient-to-r from-[hsl(271,91%,65%)] to-[hsl(212,96%,78%)]" },
  { key: "default", label: "Classic", preview: "bg-gradient-to-r from-[hsl(18,100%,60%)] to-[hsl(207,97%,15%)]" },
  { key: "ocean", label: "Ocean", preview: "bg-gradient-to-r from-[hsl(210,80%,50%)] to-[hsl(190,70%,60%)]" },
  { key: "sunset", label: "Sunset", preview: "bg-gradient-to-r from-[hsl(20,90%,55%)] to-[hsl(35,85%,60%)]" },
  { key: "forest", label: "Forest", preview: "bg-gradient-to-r from-[hsl(150,60%,40%)] to-[hsl(120,40%,55%)]" },
  { key: "lavender", label: "Lavender", preview: "bg-gradient-to-r from-[hsl(270,60%,60%)] to-[hsl(290,50%,70%)]" },
  { key: "monochrome", label: "Monochrome", preview: "bg-gradient-to-r from-[hsl(0,0%,30%)] to-[hsl(0,0%,60%)]" },
];

function hslToString(h: number, s: number, l: number) {
  return `${h} ${s}% ${l}%`;
}

export default function Admin() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { colorTheme, setColorTheme, customAccent, setCustomAccent } = useColorTheme();
  const [displayName, setDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name").eq("user_id", user.id).single().then(({ data }) => {
      if (data?.display_name) setDisplayName(data.display_name);
    });
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("user_id", user.id);
    if (error) toast.error(error.message);
    else toast.success("Profile updated!");
    setSaving(false);
  };

  const updatePassword = async () => {
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else { toast.success("Password updated!"); setNewPassword(""); setConfirmPassword(""); }
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">Profile & Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Profile, security, appearance, and preferences.</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Your personal information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email ?? ""} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="display-name">Display Name</Label>
            <Input id="display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
          </div>
          <Button size="sm" onClick={saveProfile} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Security</CardTitle>
          <CardDescription>Update your password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <Button size="sm" onClick={updatePassword}>Update Password</Button>
        </CardContent>
      </Card>

      {/* Billing */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Billing</CardTitle>
              <CardDescription>Manage your subscription plan.</CardDescription>
            </div>
            <Badge variant="secondary">Free Plan</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">Upgrade to unlock unlimited generations, priority support, and advanced features.</p>
          <Button size="sm" variant="outline" disabled>
            Manage Billing
            <Badge variant="outline" className="ml-2 text-[10px]">Coming Soon</Badge>
          </Button>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>Customize how the app looks.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <Label>Theme</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Color Palette</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PALETTES.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setColorTheme(p.key)}
                  className={`relative rounded-lg border-2 p-3 transition-all ${colorTheme === p.key ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40"}`}
                >
                  <div className={`h-8 rounded-md ${p.preview} mb-2`} />
                  <p className="text-xs font-medium text-foreground">{p.label}</p>
                  {colorTheme === p.key && (
                    <div className="absolute top-1.5 right-1.5 rounded-full bg-primary p-0.5">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Custom Accent Color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={customAccent ? `hsl(${customAccent})` : "#ff6b2b"}
                onChange={(e) => {
                  // Convert hex to HSL string
                  const hex = e.target.value;
                  const r = parseInt(hex.slice(1, 3), 16) / 255;
                  const g = parseInt(hex.slice(3, 5), 16) / 255;
                  const b = parseInt(hex.slice(5, 7), 16) / 255;
                  const max = Math.max(r, g, b), min = Math.min(r, g, b);
                  let h = 0, s = 0;
                  const l = (max + min) / 2;
                  if (max !== min) {
                    const d = max - min;
                    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                    else if (max === g) h = ((b - r) / d + 2) / 6;
                    else h = ((r - g) / d + 4) / 6;
                  }
                  setCustomAccent(hslToString(Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)));
                }}
                className="h-10 w-10 cursor-pointer rounded border border-input"
              />
              <p className="text-xs text-muted-foreground flex-1">Pick a custom accent color to override the palette's primary.</p>
              {customAccent && (
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setCustomAccent("")}>Reset</Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <VoiceStyleSettings />

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
          <CardDescription>Manage how you receive updates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="email-notifs">Email notifications</Label>
            <Switch id="email-notifs" defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="gen-notifs">Generation complete alerts</Label>
            <Switch id="gen-notifs" defaultChecked />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
