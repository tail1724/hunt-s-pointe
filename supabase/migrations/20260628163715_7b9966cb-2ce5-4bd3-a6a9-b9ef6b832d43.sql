
-- 1) signup_invites
CREATE TABLE public.signup_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  email_pattern text,
  max_uses integer NOT NULL DEFAULT 1,
  used_count integer NOT NULL DEFAULT 0,
  tier text NOT NULL DEFAULT 'standard',
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.signup_invites TO authenticated;
GRANT ALL ON public.signup_invites TO service_role;
ALTER TABLE public.signup_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read invites they created"
  ON public.signup_invites FOR SELECT TO authenticated
  USING (created_by = auth.uid());
-- Mutations restricted to service_role (edge functions); no policy for authenticated.

CREATE TRIGGER trg_signup_invites_updated_at
  BEFORE UPDATE ON public.signup_invites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) partner_feedback
CREATE TABLE public.partner_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_of date NOT NULL DEFAULT CURRENT_DATE,
  ui_rating integer CHECK (ui_rating BETWEEN 1 AND 5),
  output_rating integer CHECK (output_rating BETWEEN 1 AND 5),
  workflow_rating integer CHECK (workflow_rating BETWEEN 1 AND 5),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_feedback TO authenticated;
GRANT ALL ON public.partner_feedback TO service_role;
ALTER TABLE public.partner_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own feedback"
  ON public.partner_feedback FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_partner_feedback_updated_at
  BEFORE UPDATE ON public.partner_feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) waitlist.program label
ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS program text;

-- 4) profiles.tier + trial_days_override
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS trial_days_override integer;

-- 5) system_settings.trial_days (column may not exist — add it)
ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS trial_days integer NOT NULL DEFAULT 30;
