
-- Create generations table
CREATE TABLE public.generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  prompt_history_id uuid REFERENCES public.prompt_history(id) ON DELETE SET NULL,
  media_type text NOT NULL DEFAULT 'image',
  source_prompt text NOT NULL,
  result_url text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own generations"
  ON public.generations
  FOR ALL
  TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create storage bucket for generated media
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-media', 'generated-media', true);

-- Storage RLS: authenticated users can upload
CREATE POLICY "Authenticated users can upload generated media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'generated-media');

-- Anyone can read (public bucket)
CREATE POLICY "Anyone can read generated media"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'generated-media');
