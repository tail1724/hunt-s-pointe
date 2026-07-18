// Deep-integration search: find the user's existing app content (documents,
// collections, creations, PressRoom chats) to attach to Organize cards.

import { supabase } from "@/integrations/supabase/client";
import type { LinkKind } from "./types";

export interface ContentHit {
  kind: LinkKind;
  id: string;
  title: string;
}

const clamp = (s: string, n = 80) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/**
 * Search each content surface by title (recent items when the query is empty).
 * RLS scopes rows to the signed-in user; limits keep the palette snappy.
 */
export async function searchContent(query: string): Promise<ContentHit[]> {
  const q = query.trim();
  const like = `%${q}%`;

  const documents = supabase
    .from("documents")
    .select("id, title")
    .order("updated_at", { ascending: false })
    .limit(5);
  const collections = supabase
    .from("collections")
    .select("id, name")
    .order("updated_at", { ascending: false })
    .limit(5);
  const generations = supabase
    .from("generations")
    .select("id, source_prompt")
    .order("created_at", { ascending: false })
    .limit(5);
  const sessions = supabase
    .from("partner_sessions")
    .select("id, title")
    .order("updated_at", { ascending: false })
    .limit(5);

  const [docs, cols, gens, sess] = await Promise.all([
    q ? documents.ilike("title", like) : documents,
    q ? collections.ilike("name", like) : collections,
    q ? generations.ilike("source_prompt", like) : generations,
    q ? sessions.ilike("title", like) : sessions,
  ]);

  const hits: ContentHit[] = [];
  for (const d of docs.data ?? []) hits.push({ kind: "document", id: d.id, title: clamp(d.title || "Untitled document") });
  for (const c of cols.data ?? []) hits.push({ kind: "collection", id: c.id, title: clamp(c.name || "Untitled collection") });
  for (const g of gens.data ?? []) hits.push({ kind: "generation", id: g.id, title: clamp(g.source_prompt || "Untitled creation") });
  for (const s of sess.data ?? []) hits.push({ kind: "session", id: s.id, title: clamp(s.title || "Untitled chat") });
  return hits;
}
