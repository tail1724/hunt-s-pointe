import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Collection, CollectionArtifact, CollectionItem } from "./types";

export function useCollections() {
  const { user } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("collections" as any)
      .select("*")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("updated_at", { ascending: false });
    setCollections((data ?? []) as unknown as Collection[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (name: string, description?: string, color = "indigo") => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("collections" as any)
        .insert({ user_id: user.id, name, description: description ?? null, color } as any)
        .select("*")
        .single();
      if (error) return null;
      await refresh();
      return data as unknown as Collection;
    },
    [user, refresh],
  );

  const update = useCallback(
    async (id: string, patch: Partial<Pick<Collection, "name" | "description" | "color" | "icon">>) => {
      await supabase.from("collections" as any).update(patch as any).eq("id", id);
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await supabase.from("collections" as any).delete().eq("id", id);
      await refresh();
    },
    [refresh],
  );

  return { collections, loading, refresh, create, update, remove };
}

export function useCollection(id: string | null) {
  const { user } = useAuth();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [artifacts, setArtifacts] = useState<CollectionArtifact[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!id || !user) return;
    setLoading(true);
    const [colRes, itemsRes, artsRes] = await Promise.all([
      supabase.from("collections" as any).select("*").eq("id", id).single(),
      supabase.from("collection_items" as any).select("*").eq("collection_id", id).order("created_at", { ascending: false }),
      supabase.from("collection_artifacts" as any).select("*").eq("collection_id", id).order("created_at", { ascending: false }),
    ]);
    setCollection(((colRes.data ?? null) as unknown) as Collection | null);
    setItems(((itemsRes.data ?? []) as unknown) as CollectionItem[]);
    setArtifacts(((artsRes.data ?? []) as unknown) as CollectionArtifact[]);
    setLoading(false);
  }, [id, user]);

  useEffect(() => { refresh(); }, [refresh]);

  return { collection, items, artifacts, loading, refresh };
}

/** Tag any artifact (mary session, document, image) to a collection. Idempotent via unique constraint. */
export async function tagArtifact(opts: {
  collectionId: string;
  userId: string;
  artifactType: "mary_session" | "document" | "image";
  artifactId: string;
  previewTitle?: string;
  previewSnippet?: string;
}) {
  await supabase.from("collection_artifacts" as any).upsert(
    {
      collection_id: opts.collectionId,
      user_id: opts.userId,
      artifact_type: opts.artifactType,
      artifact_id: opts.artifactId,
      preview_title: opts.previewTitle ?? null,
      preview_snippet: opts.previewSnippet ?? null,
    } as any,
    { onConflict: "collection_id,artifact_type,artifact_id" } as any,
  );
}
