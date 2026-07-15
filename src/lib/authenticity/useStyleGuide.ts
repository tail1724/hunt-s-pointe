import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface StyleGuide {
  id: string;
  user_id: string;
  banned_phrases: string[];
  formatting_notes: string | null;
  house_stance: string | null;
}

/**
 * The publication's house style — one row per user for v1. Rules here are
 * injected into every PressRoom editing prompt as a hard constraint (see
 * `style_rules` on document-ai / write-assist) and enforced for free,
 * client-side, by the banned-phrase linter in the editor.
 */
export function useStyleGuide() {
  const { user } = useAuth();
  const [guide, setGuide] = useState<StyleGuide | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("style_guides" as any)
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    setGuide((data as unknown as StyleGuide) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (input: { bannedPhrases: string[]; formattingNotes: string | null; houseStance: string | null }) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("style_guides" as any)
      .upsert({
        user_id: user.id,
        banned_phrases: input.bannedPhrases,
        formatting_notes: input.formattingNotes,
        house_stance: input.houseStance,
        updated_at: new Date().toISOString(),
      } as any, { onConflict: "user_id" })
      .select("*")
      .single();
    if (!error) setGuide((data as unknown as StyleGuide) ?? null);
  }, [user]);

  /** Rendered as the `style_rules` array injected into editing prompts. */
  const asRules = (): string[] => {
    if (!guide) return [];
    const rules: string[] = [];
    if (guide.banned_phrases.length > 0) rules.push(`Never use these banned phrases: ${guide.banned_phrases.join(", ")}`);
    if (guide.formatting_notes) rules.push(guide.formatting_notes);
    if (guide.house_stance) rules.push(`House narrative stance: ${guide.house_stance}`);
    return rules;
  };

  return { guide, loading, save, asRules, reload: load };
}
