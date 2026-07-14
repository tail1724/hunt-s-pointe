CREATE TABLE public.scripture_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  primary_translation text NOT NULL DEFAULT 'KJV',
  secondary_translation text,
  tradition text NOT NULL DEFAULT 'Non-denominational Evangelical',
  prose_style text NOT NULL DEFAULT 'Expository / Verse-by-verse',
  reading_level int NOT NULL DEFAULT 3 CHECK (reading_level BETWEEN 1 AND 5),
  citation_density text NOT NULL DEFAULT 'Balanced',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scripture_preferences TO authenticated;
GRANT ALL ON public.scripture_preferences TO service_role;

ALTER TABLE public.scripture_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own scripture preferences"
  ON public.scripture_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER scripture_preferences_updated_at
  BEFORE UPDATE ON public.scripture_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();