-- Link each history entry back to the Ezra session it came from, so
-- "Continue in Ezra" can reopen the original conversation instead of
-- seeding a fresh one. Nullable: legacy rows and non-chat entries have
-- no session.
ALTER TABLE public.prompt_history
  ADD COLUMN IF NOT EXISTS session_id uuid;

CREATE INDEX IF NOT EXISTS idx_prompt_history_session_id
  ON public.prompt_history (session_id)
  WHERE session_id IS NOT NULL;
