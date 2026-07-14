import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Collection, CollectionSurface } from "./types";

/**
 * Per-user × per-surface active collection. Persisted server-side so the chip
 * survives reloads and follows the user across devices.
 */
export function useActiveCollection(surface: CollectionSurface) {
  const { user } = useAuth();
  const [activeId, setActiveIdState] = useState<string | null>(null);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("active_collection_selection" as any)
      .select("collection_id")
      .eq("user_id", user.id)
      .eq("surface", surface)
      .maybeSingle();
    const cid = (data as any)?.collection_id ?? null;
    setActiveIdState(cid);
    if (cid) {
      const { data: col } = await supabase
        .from("collections" as any).select("*").eq("id", cid).maybeSingle();
      setCollection(((col ?? null) as unknown) as Collection | null);
    } else {
      setCollection(null);
    }
    setLoading(false);
  }, [user, surface]);

  useEffect(() => { load(); }, [load]);

  const setActive = useCallback(async (collectionId: string | null) => {
    if (!user) return;
    setActiveIdState(collectionId);
    await supabase.from("active_collection_selection" as any).upsert(
      { user_id: user.id, surface, collection_id: collectionId, updated_at: new Date().toISOString() } as any,
      { onConflict: "user_id,surface" } as any,
    );
    if (collectionId) {
      const { data: col } = await supabase
        .from("collections" as any).select("*").eq("id", collectionId).maybeSingle();
      setCollection(((col ?? null) as unknown) as Collection | null);
    } else {
      setCollection(null);
    }
  }, [user, surface]);

  return { activeId, collection, loading, setActive, refresh: load };
}
