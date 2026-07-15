-- Phase 4 of the Hunt's Pointe / PressRoom pivot: editorial intelligence
-- (docs/hunts-pointe-pressroom-addendum.md, Group I — feature 1). Structure
-- analysis (feature 8) and interlinking (feature 7) render straight into
-- document_annotations from Phase 2 and need no new table.

CREATE TABLE public.claim_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  claim_text text NOT NULL,
  verdict text NOT NULL DEFAULT 'unverifiable' CHECK (verdict IN ('supported', 'contradicted', 'unverifiable')),
  confidence numeric(3, 2) NOT NULL DEFAULT 0,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  checked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX claim_checks_document_idx ON public.claim_checks (document_id, checked_at DESC);

ALTER TABLE public.claim_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own claim checks"
  ON public.claim_checks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
