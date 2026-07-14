-- Guardrail telemetry: one row per blocked AI request. Users can read their
-- own history (surfaced in Analytics); inserts come from edge functions
-- running with the user's JWT, so WITH CHECK pins attribution.

CREATE TABLE public.guardrail_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  function text NOT NULL,
  category text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX guardrail_events_user_idx ON public.guardrail_events (user_id, created_at DESC);

ALTER TABLE public.guardrail_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own guardrail events"
  ON public.guardrail_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can record their own guardrail events"
  ON public.guardrail_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);
