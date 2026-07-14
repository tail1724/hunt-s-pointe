ALTER TABLE public.generations
  ADD COLUMN caption text,
  ADD COLUMN scheduled_date date,
  ADD COLUMN scheduled_time_slot text;