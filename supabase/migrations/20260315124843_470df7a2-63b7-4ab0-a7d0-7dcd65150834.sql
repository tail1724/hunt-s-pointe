
-- Create prompt_feedback table
CREATE TABLE public.prompt_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  prompt_history_id uuid REFERENCES public.prompt_history(id) ON DELETE CASCADE NOT NULL,
  vote text,
  accuracy_score integer,
  corrective_input text,
  refinement_output jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prompt_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own feedback"
  ON public.prompt_feedback FOR ALL
  TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create usage_logs table
CREATE TABLE public.usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own logs"
  ON public.usage_logs FOR SELECT
  TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logs"
  ON public.usage_logs FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id);
