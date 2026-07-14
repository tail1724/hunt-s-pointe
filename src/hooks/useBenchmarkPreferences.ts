import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface BenchmarkPrefs {
  enabled: boolean;
  cooldown_sec: number;
}

const DEFAULTS: BenchmarkPrefs = { enabled: true, cooldown_sec: 90 };
const LS_KEY = "sentient.benchmark.prefs";

export function useBenchmarkPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<BenchmarkPrefs>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {}
    return DEFAULTS;
  });

  // Load from server preferences
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("preferences")
        .eq("user_id", user.id)
        .maybeSingle();
      const b = (data?.preferences as any)?.benchmark;
      if (b && typeof b === "object") setPrefs((prev) => ({ ...prev, ...b }));
    })();
  }, [user]);

  const update = useCallback(async (patch: Partial<BenchmarkPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
      if (user) {
        supabase.from("system_settings").upsert(
          { user_id: user.id, preferences: { benchmark: next } as any },
          { onConflict: "user_id" }
        ).then(() => {});
      }
      return next;
    });
  }, [user]);

  return { prefs, update };
}
