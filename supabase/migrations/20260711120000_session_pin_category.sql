-- Chat organization for the Ezra sessions drawer: pin a chat to the top and
-- assign it a free-form category. Both nullable; existing RLS on
-- partner_sessions already scopes rows to the owner. The Analytics → History
-- log stays purely chronological and ignores these columns.

ALTER TABLE public.partner_sessions
  ADD COLUMN IF NOT EXISTS pinned_at timestamptz,
  ADD COLUMN IF NOT EXISTS category text;

-- Pinned lookups are per-user and small; a partial index keeps the "Pinned"
-- group cheap without bloating the table's write path.
CREATE INDEX IF NOT EXISTS partner_sessions_pinned_idx
  ON public.partner_sessions (user_id, pinned_at DESC)
  WHERE pinned_at IS NOT NULL;
