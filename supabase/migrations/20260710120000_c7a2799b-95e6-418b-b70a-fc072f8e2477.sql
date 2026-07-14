-- Internal-only raw-cost ledger.
--
-- Records what each billable AI call actually cost to run (real dollars and
-- token counts), alongside the credits charged to the user. This is business
-- data, not user data: it must never be visible to authenticated users. A
-- separate internal tooling app connects with the service role to read it.
--
-- Lockdown model: RLS is ENABLED with NO policies, and the anon/authenticated
-- roles have every grant revoked. With RLS on and zero policies, those roles
-- can neither read nor write any row. The service role bypasses RLS entirely,
-- so edge functions (writing) and the future internal app (reading) still have
-- full access. There is intentionally no per-user SELECT policy.

CREATE TABLE public.internal_cost_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,              -- image_generation | chat_message | orchestration | …
  model text,                            -- the model actually invoked
  input_tokens int,
  output_tokens int,
  raw_cost_usd numeric(10, 6) NOT NULL DEFAULT 0,   -- true provider cost to us
  credits_charged numeric(8, 2) NOT NULL DEFAULT 0, -- what the user was billed, in credits
  power_level int,                       -- Ezra power-dial level, when applicable
  turbo boolean,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.internal_cost_ledger ENABLE ROW LEVEL SECURITY;

-- Belt and suspenders: strip table privileges from the client-facing roles so
-- even a future accidental permissive policy can't expose this data.
REVOKE ALL ON public.internal_cost_ledger FROM anon, authenticated;
GRANT ALL ON public.internal_cost_ledger TO service_role;

CREATE INDEX internal_cost_ledger_user_created_idx
  ON public.internal_cost_ledger (user_id, created_at DESC);

CREATE INDEX internal_cost_ledger_event_idx
  ON public.internal_cost_ledger (event_type, created_at DESC);
