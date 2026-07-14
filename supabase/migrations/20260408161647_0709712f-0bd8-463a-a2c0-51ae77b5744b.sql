
ALTER TABLE public.nexus_logs
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS robustness_score integer,
  ADD COLUMN IF NOT EXISTS robustness_vector jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pipe_a_output text,
  ADD COLUMN IF NOT EXISTS pipe_b_output text,
  ADD COLUMN IF NOT EXISTS delta_score integer;

CREATE OR REPLACE FUNCTION public.get_system_baseline(target_category text)
RETURNS integer AS $$
BEGIN
  RETURN COALESCE(
    (SELECT avg(robustness_score)::integer FROM public.nexus_logs WHERE category = target_category AND robustness_score IS NOT NULL),
    50
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.validate_system_settings_mode()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.current_mode NOT IN ('presence') THEN
    RAISE EXCEPTION 'current_mode must be presence';
  END IF;
  RETURN NEW;
END;
$function$;
