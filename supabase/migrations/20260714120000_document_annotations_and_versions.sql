-- Phase 2 of the Hunt's Pointe / PressRoom pivot: the suggestion-only margin
-- architecture (docs/hunts-pointe-pressroom-addendum.md, feature 15) and
-- attributed HITL version history (feature 6).
--
-- document_annotations: every PressRoom edit suggestion — from the bubble
-- menu, the slash menu, the margin assistant, and (later) the style/fact/
-- structure passes — lands here as a proposal, never as a direct edit to
-- `documents.content`. The editor renders these as margin cards; applying
-- one is a deliberate, individually-attributed action (see document_versions
-- below), never a bulk "accept all".
--
-- document_versions: a timeline of the manuscript, each entry attributed to
-- a human edit or an applied AI suggestion, with a one-line semantic summary
-- for AI-attributed entries. Powers the History drawer's rollback and is the
-- data source for the Phase 3 provenance certificate.

CREATE TABLE public.document_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'suggestion' CHECK (kind IN ('suggestion', 'flag', 'note')),
  -- Character offsets into content_text at creation time. Nullable: a
  -- document-level suggestion (e.g. "continue writing") anchors at the
  -- cursor position only (span_from = span_to) or not at all.
  span_from integer,
  span_to integer,
  anchor_text text,
  body text NOT NULL,
  proposed_text text,
  -- Which surface produced it, for telemetry and future per-feature styling.
  source text NOT NULL DEFAULT 'assist' CHECK (source IN ('assist', 'bubble', 'slash', 'fact_check', 'style', 'structure', 'interlink', 'cadence', 'tell')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'applied', 'dismissed')),
  severity text NOT NULL DEFAULT 'suggestion' CHECK (severity IN ('suggestion', 'warning')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX document_annotations_document_idx ON public.document_annotations (document_id, status, created_at DESC);

ALTER TABLE public.document_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own annotations"
  ON public.document_annotations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content jsonb NOT NULL,
  content_text text NOT NULL DEFAULT '',
  author_kind text NOT NULL DEFAULT 'human' CHECK (author_kind IN ('human', 'ai_suggestion', 'ai_pipeline')),
  change_summary text,
  label text,
  annotation_id uuid REFERENCES public.document_annotations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX document_versions_document_idx ON public.document_versions (document_id, created_at DESC);

ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own document versions"
  ON public.document_versions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
