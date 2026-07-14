-- Bible reader bookmarks: verse- or chapter-level, distinct from highlights.
-- Mirrors bible_annotations' shape and RLS. verse NULL = whole-chapter bookmark
-- (the "ribbon"). Translation-agnostic key so a bookmark placed in KJV appears
-- when reading NHEB; the translation column records where it was made.

CREATE TABLE public.bible_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  translation text NOT NULL DEFAULT 'KJV',
  book text NOT NULL,
  chapter integer NOT NULL,
  verse integer,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Partial unique indexes because UNIQUE treats NULLs as distinct: one ribbon
-- per chapter, one bookmark per verse.
CREATE UNIQUE INDEX bible_bookmarks_chapter_key
  ON public.bible_bookmarks (user_id, book, chapter)
  WHERE verse IS NULL;
CREATE UNIQUE INDEX bible_bookmarks_verse_key
  ON public.bible_bookmarks (user_id, book, chapter, verse)
  WHERE verse IS NOT NULL;
CREATE INDEX bible_bookmarks_user_recent_idx
  ON public.bible_bookmarks (user_id, created_at DESC);

ALTER TABLE public.bible_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bible bookmarks"
  ON public.bible_bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bible bookmarks"
  ON public.bible_bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bible bookmarks"
  ON public.bible_bookmarks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bible bookmarks"
  ON public.bible_bookmarks FOR DELETE
  USING (auth.uid() = user_id);
