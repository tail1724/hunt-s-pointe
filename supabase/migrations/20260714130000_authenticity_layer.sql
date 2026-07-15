-- Phase 3 of the Hunt's Pointe / PressRoom pivot: the authenticity layer
-- (docs/hunts-pointe-pressroom-addendum.md, Group III — features 2, 11, 13).
-- Protects the EIC's voice while PressRoom manages the pipeline.

-- style_guides: one row per user (v1 — no multi-guide support yet). Rules
-- injected into every editing prompt (document-ai, write-assist) as a hard
-- constraint, and enforced client-side for free via a deterministic linter.
CREATE TABLE public.style_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  banned_phrases text[] NOT NULL DEFAULT '{}'::text[],
  formatting_notes text,
  house_stance text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.style_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own style guide"
  ON public.style_guides FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- voice_profiles: the EIC's protected stylistic traits — em dashes, sentence
-- fragments, colloquialisms, whatever makes the prose unmistakably theirs.
-- Every editing prompt is instructed never to "correct" these away.
CREATE TABLE public.voice_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  locked_traits text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.voice_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own voice profile"
  ON public.voice_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- provenance_ledger: a hash-chained sequence of AGGREGATE session digests
-- per document — never keystroke content. Each row seals a short window of
-- editing activity (active seconds, keystroke/backspace counts, human vs.
-- AI-attributed character deltas) and chains to the previous seal via
-- prev_hash, so the sequence can be verified client-side for gaps or
-- tampering. This is the data source for the "Proof of Human Work"
-- certificate attached to CMS exports (Phase 5).
CREATE TABLE public.provenance_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  seal_hash text NOT NULL,
  prev_hash text,
  active_seconds integer NOT NULL DEFAULT 0,
  keystroke_count integer NOT NULL DEFAULT 0,
  backspace_count integer NOT NULL DEFAULT 0,
  human_chars_delta integer NOT NULL DEFAULT 0,
  ai_chars_delta integer NOT NULL DEFAULT 0,
  sealed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX provenance_ledger_document_idx ON public.provenance_ledger (document_id, sealed_at);

ALTER TABLE public.provenance_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own provenance ledger"
  ON public.provenance_ledger FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
