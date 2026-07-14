-- Bible reader annotations: highlights + notes, keyed per verse per user.
-- Deliberately translation-agnostic in the unique key so a highlight made in
-- KJV shows when reading NHEB; the translation column records where it was made.

CREATE TABLE public.bible_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  translation text NOT NULL DEFAULT 'KJV',
  book text NOT NULL,
  chapter integer NOT NULL,
  verse integer NOT NULL,
  color text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, book, chapter, verse)
);

CREATE INDEX bible_annotations_user_passage_idx
  ON public.bible_annotations (user_id, book, chapter);

ALTER TABLE public.bible_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bible annotations"
  ON public.bible_annotations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bible annotations"
  ON public.bible_annotations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bible annotations"
  ON public.bible_annotations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bible annotations"
  ON public.bible_annotations FOR DELETE
  USING (auth.uid() = user_id);
