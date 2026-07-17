-- Epic F (VaporNet Americana gap-remediation plan): tracks the push history
-- of a document into SignalDesk so the edge function can compute
-- source_version (incremented per push, not per edit) and so the write
-- surface can show a persistent "last staged" / downstream-status receipt
-- without re-deriving it from toast state.

CREATE TABLE public.signaldesk_pushes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  push_count integer NOT NULL DEFAULT 0,
  last_status text,
  last_draft_id text,
  last_admin_path text,
  last_error text,
  last_pushed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id)
);

CREATE INDEX signaldesk_pushes_document_idx ON public.signaldesk_pushes (document_id);

ALTER TABLE public.signaldesk_pushes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own SignalDesk push receipts"
  ON public.signaldesk_pushes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
