import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ScripturePreferencesRow {
  user_id: string;
  primary_translation: string;
  secondary_translation: string | null;
  tradition: string;
  prose_style: string;
  reading_level: number;
  citation_density: string;
}

const DEFAULTS: Omit<ScripturePreferencesRow, "user_id"> = {
  primary_translation: "KJV",
  secondary_translation: null,
  tradition: "Non-denominational Evangelical",
  prose_style: "Expository / Verse-by-verse",
  reading_level: 3,
  citation_density: "Balanced",
};

export function useScripturePreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<ScripturePreferencesRow | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (!user) { setLoaded(true); return; }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("scripture_preferences" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) console.warn("[scripture_prefs] load error", error);
      if (data) {
        setPrefs(data as any);
        setNeedsOnboarding(false);
      } else {
        setPrefs({ user_id: user.id, ...DEFAULTS });
        setNeedsOnboarding(true);
      }
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const save = useCallback(async (patch: Partial<Omit<ScripturePreferencesRow, "user_id">>) => {
    if (!user) return;
    const next: ScripturePreferencesRow = {
      ...(prefs ?? { user_id: user.id, ...DEFAULTS }),
      ...patch,
      user_id: user.id,
    };
    setPrefs(next);
    setNeedsOnboarding(false);
    const { error } = await supabase
      .from("scripture_preferences" as any)
      .upsert(next as any, { onConflict: "user_id" });
    if (error) console.warn("[scripture_prefs] save error", error);
  }, [user, prefs]);

  return { prefs, save, loaded, needsOnboarding, dismissOnboarding: () => setNeedsOnboarding(false) };
}

export const SCRIPTURE_DEFAULTS = DEFAULTS;
