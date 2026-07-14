-- Track edited copies produced by the photo editor. When a user edits a
-- generated image (adds verse text, crops, tunes), the flattened result is
-- saved as a NEW generations row whose edited_from points at the original —
-- the original is never destroyed, so edits are always non-destructive.

ALTER TABLE public.generations
  ADD COLUMN edited_from uuid REFERENCES public.generations(id) ON DELETE SET NULL;
