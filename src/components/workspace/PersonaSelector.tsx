import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

interface PersonaSelectorProps {
  value: string | null;
  onChange: (persona: Tables<"personas"> | null) => void;
}

export function PersonaSelector({ value, onChange }: PersonaSelectorProps) {
  const { user } = useAuth();
  const [personas, setPersonas] = useState<Tables<"personas">[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("personas")
      .select("*")
      .eq("user_id", user.id)
      .order("name")
      .then(({ data }) => {
        if (data) setPersonas(data);
      });
  }, [user]);

  if (personas.length === 0) return null;

  return (
    <div className="space-y-2">
      <label className="font-display text-sm font-semibold text-foreground flex items-center gap-1.5">
        <User className="h-3.5 w-3.5" /> Persona
      </label>
      <Select
        value={value || "none"}
        onValueChange={(v) => {
          if (v === "none") {
            onChange(null);
          } else {
            const p = personas.find((p) => p.id === v) || null;
            onChange(p);
          }
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="No persona" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No persona</SelectItem>
          {personas.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
              {(p.locked_stacks as string[]).length > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  ({(p.locked_stacks as string[]).length} stacks)
                </span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
