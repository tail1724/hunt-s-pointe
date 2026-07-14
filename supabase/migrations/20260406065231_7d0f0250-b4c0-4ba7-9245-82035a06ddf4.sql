
-- System Settings table
CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  current_mode text NOT NULL DEFAULT 'direct',
  harmony_score int NOT NULL DEFAULT 100,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_sync timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Validation trigger instead of CHECK constraint for current_mode
CREATE OR REPLACE FUNCTION public.validate_system_settings_mode()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.current_mode NOT IN ('presence', 'direct', 'stream') THEN
    RAISE EXCEPTION 'current_mode must be presence, direct, or stream';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_system_settings_mode
BEFORE INSERT OR UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.validate_system_settings_mode();

-- Updated_at trigger
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own settings"
ON public.system_settings
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Nexus Logs table
CREATE TABLE public.nexus_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  transcript text,
  action_taken text,
  viz_payload jsonb DEFAULT '{}'::jsonb,
  mode text NOT NULL DEFAULT 'direct',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.nexus_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own logs"
ON public.nexus_logs
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.nexus_logs;
