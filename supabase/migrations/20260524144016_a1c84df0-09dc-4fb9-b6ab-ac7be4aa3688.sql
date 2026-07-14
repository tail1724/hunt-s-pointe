CREATE TABLE public.session_branches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  parent_message_index integer NOT NULL,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  label text NOT NULL DEFAULT 'Snapshot',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.session_branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own branches"
ON public.session_branches
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_session_branches_session_created
ON public.session_branches (session_id, created_at DESC);