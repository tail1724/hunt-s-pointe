export type AnnotationKind = "suggestion" | "flag" | "note";
export type AnnotationSource =
  | "assist" | "bubble" | "slash"
  | "fact_check" | "style" | "structure" | "interlink" | "cadence" | "tell";
export type AnnotationStatus = "open" | "applied" | "dismissed";
export type AnnotationSeverity = "suggestion" | "warning";

export interface DocumentAnnotation {
  id: string;
  document_id: string;
  user_id: string;
  kind: AnnotationKind;
  span_from: number | null;
  span_to: number | null;
  anchor_text: string | null;
  body: string;
  proposed_text: string | null;
  source: AnnotationSource;
  status: AnnotationStatus;
  severity: AnnotationSeverity;
  created_at: string;
  resolved_at: string | null;
}

/** Shared shape for every in-editor surface that proposes a margin suggestion. */
export type ProposeAnnotationInput = {
  body: string;
  proposedText: string;
  spanFrom: number;
  spanTo: number;
  anchorText: string | null;
  source: AnnotationSource;
};
export type ProposeAnnotationFn = (input: ProposeAnnotationInput) => Promise<unknown>;

export type AuthorKind = "human" | "ai_suggestion" | "ai_pipeline";

export interface DocumentVersion {
  id: string;
  document_id: string;
  user_id: string;
  content: unknown;
  content_text: string;
  author_kind: AuthorKind;
  change_summary: string | null;
  label: string | null;
  annotation_id: string | null;
  created_at: string;
}
