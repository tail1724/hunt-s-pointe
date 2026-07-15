import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { AuthorKind, DocumentVersion } from "./types";

const MAX_VERSIONS = 200;

/**
 * Attributed version history for a document (base plan §7, extended by
 * addendum feature 6). Every save from the editor itself records a `human`
 * version; every applied margin annotation records an `ai_suggestion`
 * version with a semantic summary. This is the ledger the History drawer
 * renders and the source data for the Phase 3 provenance certificate.
 */
export function useDocumentVersions(documentId: string | null) {
  const { user } = useAuth();
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user || !documentId) { setVersions([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("document_versions" as any)
      .select("*")
      .eq("document_id", documentId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(MAX_VERSIONS);
    setVersions(((data ?? []) as unknown) as DocumentVersion[]);
    setLoading(false);
  }, [user, documentId]);

  useEffect(() => { load(); }, [load]);

  const record = useCallback(async (input: {
    content: unknown;
    contentText: string;
    authorKind: AuthorKind;
    changeSummary?: string | null;
    label?: string | null;
    annotationId?: string | null;
  }) => {
    if (!user || !documentId) return null;
    const { data, error } = await supabase
      .from("document_versions" as any)
      .insert({
        document_id: documentId,
        user_id: user.id,
        content: input.content as any,
        content_text: input.contentText,
        author_kind: input.authorKind,
        change_summary: input.changeSummary ?? null,
        label: input.label ?? null,
        annotation_id: input.annotationId ?? null,
      } as any)
      .select("*")
      .single();
    if (error) return null;
    const row = (data as unknown) as DocumentVersion;
    setVersions((prev) => [row, ...prev]);
    return row;
  }, [user, documentId]);

  return { versions, loading, record, reload: load };
}
