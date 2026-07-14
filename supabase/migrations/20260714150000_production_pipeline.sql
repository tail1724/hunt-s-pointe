-- Phase 5 of the Hunt's Pointe / PressRoom pivot: the production pipeline
-- (docs/hunts-pointe-pressroom-addendum.md, Group II — features 3, 4, 5, 9, 10).
-- Everything here is machine-authored by design (addendum §C.0) — outputs
-- live outside the manuscript, always labeled, always human-reviewed.

-- Feature 3: headless CMS schema mapping. v1 ships two built-in formats
-- (structured JSON, Markdown + front-matter); this table lets a user save
-- named field-mapping presets for repeat exports.
CREATE TABLE public.cms_schemas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  format text NOT NULL DEFAULT 'json' CHECK (format IN ('json', 'markdown')),
  field_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cms_schemas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own CMS schemas"
  ON public.cms_schemas FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Feature 4 & 10: derived, machine-authored assets that live OUTSIDE the
-- manuscript — cascades (SEO/newsletter/social/excerpt) and regional
-- localizations both land here, distinguished by asset_type.
CREATE TABLE public.document_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  asset_type text NOT NULL, -- 'seo' | 'newsletter' | 'social_thread' | 'excerpt' | 'regional:<locale>'
  content text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'discarded')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX document_assets_document_idx ON public.document_assets (document_id, asset_type);

ALTER TABLE public.document_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own document assets"
  ON public.document_assets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Feature 5: headline sandbox. Heuristic scores today (formula match,
-- length/clarity bands, house-style fit) — outcomes accumulate here so a
-- real predictive model can train on picked-vs-generated data later.
CREATE TABLE public.headline_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  variants jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{formula, channel, headline, heuristic_score}]
  picked_headline text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.headline_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own headline outcomes"
  ON public.headline_outcomes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Feature 10: regional sub-edition profiles (locale, units, idiom notes).
CREATE TABLE public.region_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  locale text NOT NULL, -- e.g. 'en-GB', 'en-AU', 'es-MX'
  label text NOT NULL,
  spelling_system text, -- 'US' | 'UK' | ...
  unit_system text, -- 'imperial' | 'metric'
  idiom_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, locale)
);

ALTER TABLE public.region_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own region profiles"
  ON public.region_profiles FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Feature 9: bulk pipeline orchestrator. A template describes what a batch
-- run should produce; each run processes a set of raw inputs into
-- standardized drafts, one run_item per input, each landing as an
-- auto_created `documents` row in draft status — nothing skips review.
CREATE TABLE public.pipeline_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  instruction text NOT NULL, -- e.g. "Turn this press release into a news brief"
  output_status text NOT NULL DEFAULT 'draft' CHECK (output_status IN ('draft', 'in_review')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own pipeline templates"
  ON public.pipeline_templates FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.pipeline_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_id uuid REFERENCES public.pipeline_templates(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  item_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.pipeline_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own pipeline runs"
  ON public.pipeline_runs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.pipeline_run_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.pipeline_runs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  raw_input text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'failed')),
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pipeline_run_items_run_idx ON public.pipeline_run_items (run_id);

ALTER TABLE public.pipeline_run_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own pipeline run items"
  ON public.pipeline_run_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
