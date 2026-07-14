
-- 1. Lock down shared_sessions: remove public table SELECT, replace with a slug-scoped RPC
DROP POLICY IF EXISTS "Public can read by slug if not expired" ON public.shared_sessions;

CREATE OR REPLACE FUNCTION public.get_shared_session(_slug text)
RETURNS TABLE(title text, messages jsonb, redact_user_msgs boolean, expires_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ps.title, ps.messages, ss.redact_user_msgs, ss.expires_at
  FROM public.shared_sessions ss
  JOIN public.partner_sessions ps ON ps.id = ss.session_id
  WHERE ss.slug = _slug
    AND (ss.expires_at IS NULL OR ss.expires_at > now())
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_session(text) TO anon, authenticated;

-- 2. Storage: enforce per-user folder scoping on generated-media + add UPDATE/DELETE
DROP POLICY IF EXISTS "Users can upload to generated-media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read generated-media" ON storage.objects;
DROP POLICY IF EXISTS "Users insert own files in generated-media" ON storage.objects;
DROP POLICY IF EXISTS "Users update own files in generated-media" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own files in generated-media" ON storage.objects;
DROP POLICY IF EXISTS "Public read generated-media" ON storage.objects;

CREATE POLICY "Public read generated-media"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'generated-media');

CREATE POLICY "Users insert own files in generated-media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'generated-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users update own files in generated-media"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'generated-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users delete own files in generated-media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'generated-media'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Realtime: nexus_logs leak — remove from publication (no UI subscribes to it)
ALTER PUBLICATION supabase_realtime DROP TABLE public.nexus_logs;

-- 4. Lock down SECURITY DEFINER app functions from anon
REVOKE EXECUTE ON FUNCTION public.match_past_prompts(vector, uuid, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.match_knowledge(vector, uuid, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_system_baseline(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.match_past_prompts(vector, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_knowledge(vector, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_system_baseline(text) TO authenticated;
