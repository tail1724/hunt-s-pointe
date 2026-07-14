
-- Create vibe_cloud_terms table
CREATE TABLE public.vibe_cloud_terms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  term TEXT NOT NULL,
  category TEXT NOT NULL,
  weight INTEGER NOT NULL DEFAULT 3,
  negative_pair TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vibe_cloud_terms ENABLE ROW LEVEL SECURITY;

-- Read-only for authenticated users
CREATE POLICY "Vibe terms readable by authenticated"
ON public.vibe_cloud_terms
FOR SELECT
TO authenticated
USING (true);

-- Add vibes column to prompt_history
ALTER TABLE public.prompt_history
ADD COLUMN vibes JSONB DEFAULT '[]'::jsonb;
