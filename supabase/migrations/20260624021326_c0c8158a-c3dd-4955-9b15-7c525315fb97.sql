ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON public.documents(user_id, deleted_at) WHERE deleted_at IS NOT NULL;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;