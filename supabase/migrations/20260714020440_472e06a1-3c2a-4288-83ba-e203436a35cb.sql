
-- Documents: newsroom fields
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS headline text,
  ADD COLUMN IF NOT EXISTS dek text,
  ADD COLUMN IF NOT EXISTS byline text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS section text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS publish_at timestamptz,
  ADD COLUMN IF NOT EXISTS story_tags text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS story_package_id uuid REFERENCES public.collections(id) ON DELETE SET NULL;

-- Validate status values via trigger (avoid brittle CHECK constraints during restore)
CREATE OR REPLACE FUNCTION public.validate_document_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('draft','in_review','ready','published','archived') THEN
    RAISE EXCEPTION 'documents.status must be one of draft, in_review, ready, published, archived';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS documents_validate_status ON public.documents;
CREATE TRIGGER documents_validate_status
BEFORE INSERT OR UPDATE ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.validate_document_status();

-- Backfill headline from existing title
UPDATE public.documents SET headline = title WHERE headline IS NULL;

CREATE INDEX IF NOT EXISTS documents_status_idx ON public.documents (status);
CREATE INDEX IF NOT EXISTS documents_story_package_idx ON public.documents (story_package_id);

-- Collections: story-package fields
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS angle text,
  ADD COLUMN IF NOT EXISTS deadline date,
  ADD COLUMN IF NOT EXISTS assigned_to text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open';

CREATE OR REPLACE FUNCTION public.validate_collection_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('open','drafting','ready','shipped') THEN
    RAISE EXCEPTION 'collections.status must be one of open, drafting, ready, shipped';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS collections_validate_status ON public.collections;
CREATE TRIGGER collections_validate_status
BEFORE INSERT OR UPDATE ON public.collections
FOR EACH ROW EXECUTE FUNCTION public.validate_collection_status();

CREATE INDEX IF NOT EXISTS collections_status_idx ON public.collections (status);
