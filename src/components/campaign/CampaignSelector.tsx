import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Megaphone } from "lucide-react";

interface CampaignSelectorProps {
  value: string | null;
  onChange: (campaignId: string | null) => void;
}

export function CampaignSelector({ value, onChange }: CampaignSelectorProps) {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<{ id: string; name: string; avatar_url: string | null }[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("campaigns")
      .select("id, name, avatar_url")
      .eq("user_id", user.id)
      .order("name")
      .then(({ data }) => {
        if (data) setCampaigns(data);
      });
  }, [user]);

  if (campaigns.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <Megaphone className="h-4 w-4 text-muted-foreground shrink-0" />
      <Select
        value={value || "__none__"}
        onValueChange={(v) => onChange(v === "__none__" ? null : v)}
      >
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder="No campaign" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">No campaign</SelectItem>
          {campaigns.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              <span className="flex items-center gap-2">
                <Avatar className="h-4 w-4">
                  <AvatarImage src={c.avatar_url || undefined} />
                  <AvatarFallback className="text-[8px]">{c.name[0]}</AvatarFallback>
                </Avatar>
                {c.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
