import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { AnnotationSource, DocumentAnnotation } from "./types";

/**
 * The margin annotation queue for a single document. This is the only
 * channel through which PressRoom may propose a change to a manuscript
 * (see docs/hunts-pointe-pressroom-addendum.md feature 15) — every
 * suggestion lands here as `status: "open"` and the editor decides whether
 * to apply, dismiss, or ignore it. Nothing here ever touches `documents.content`.
 */
export function useDocumentAnnotations(documentId: string | null) {
  const { user } = useAuth();
  const [annotations, setAnnotations] = useState<DocumentAnnotation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user || !documentId) { setAnnotations([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("document_annotations" as any)
      .select("*")
      .eq("document_id", documentId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setAnnotations(((data ?? []) as unknown) as DocumentAnnotation[]);
    setLoading(false);
  }, [user, documentId]);

  useEffect(() => { load(); }, [load]);

  const propose = useCallback(async (input: {
    body: string;
    proposedText?: string | null;
    spanFrom?: number | null;
    spanTo?: number | null;
    anchorText?: string | null;
    source: AnnotationSource;
    kind?: "suggestion" | "flag" | "note";
    severity?: "suggestion" | "warning";
  }) => {
    if (!user || !documentId) return null;
    const { data, error } = await supabase
      .from("document_annotations" as any)
      .insert({
        document_id: documentId,
        user_id: user.id,
        kind: input.kind ?? "suggestion",
        span_from: input.spanFrom ?? null,
        span_to: input.spanTo ?? null,
        anchor_text: input.anchorText ?? null,
        body: input.body,
        proposed_text: input.proposedText ?? null,
        source: input.source,
        severity: input.severity ?? "suggestion",
      } as any)
      .select("*")
      .single();
    if (error) return null;
    const row = (data as unknown) as DocumentAnnotation;
    setAnnotations((prev) => [row, ...prev]);
    return row;
  }, [user, documentId]);

  const resolve = useCallback(async (id: string, status: "applied" | "dismissed") => {
    if (!user) return;
    await supabase
      .from("document_annotations" as any)
      .update({ status, resolved_at: new Date().toISOString() } as any)
      .eq("id", id)
      .eq("user_id", user.id);
    setAnnotations((prev) => prev.map((a) => (a.id === id ? { ...a, status, resolved_at: new Date().toISOString() } : a)));
  }, [user]);

  const open = annotations.filter((a) => a.status === "open");

  return { annotations, open, loading, propose, resolve, reload: load };
}
