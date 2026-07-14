import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface VoiceProfile {
  id: string;
  user_id: string;
  locked_traits: string[];
}

/**
 * The EIC's protected stylistic fingerprint (addendum feature 13) — em-dash
 * habits, signature colloquialisms, whatever makes the prose unmistakably
 * theirs. Every editing prompt gets these as hard constraints it may not
 * "correct" away, no matter what a grammar or tone pass would otherwise do.
 */
export function useVoiceProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<VoiceProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("voice_profiles" as any)
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    setProfile((data as unknown as VoiceProfile) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (lockedTraits: string[]) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("voice_profiles" as any)
      .upsert({
        user_id: user.id,
        locked_traits: lockedTraits,
        updated_at: new Date().toISOString(),
      } as any, { onConflict: "user_id" })
      .select("*")
      .single();
    if (!error) setProfile((data as unknown as VoiceProfile) ?? null);
  }, [user]);

  return { profile, loading, save, reload: load, lockedTraits: profile?.locked_traits ?? [] };
}
